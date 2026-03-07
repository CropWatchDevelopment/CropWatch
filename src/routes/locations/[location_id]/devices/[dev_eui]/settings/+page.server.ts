import { PUBLIC_API_BASE_URL } from '$env/static/public';
import { ApiService } from '$lib/api/api.service';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const DEVICE_NAME_MAX_LENGTH = 120;
const DEVICE_GROUP_MAX_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PERMISSION_LEVELS = new Set([1, 2, 3, 4]);

type DeviceFormValues = {
	name: string;
	group: string;
};

type DeviceOwnerPermissionValues = {
	ownerKey: string;
	targetUserEmail: string;
	permissionLevel: string;
};

type OwnerIdentity = {
	email: string;
	name: string;
};

type NormalizedDeviceOwner = {
	id: number;
	key: string;
	name: string;
	email: string;
	userId: string;
	permissionLevel: number;
};

const readString = (value: FormDataEntryValue | null): string => {
	if (typeof value !== 'string') return '';
	return value.trim();
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecordArray = (value: unknown): Record<string, unknown>[] =>
	Array.isArray(value) ? value.filter(isRecord) : [];

const readOptionalString = (record: Record<string, unknown> | null, key: string): string => {
	if (!record) return '';
	const value = record[key];
	return typeof value === 'string' ? value.trim() : '';
};

const readOptionalNumber = (record: Record<string, unknown> | null, key: string): number | null => {
	if (!record) return null;
	const value = record[key];
	return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

async function parseResponsePayload(response: Response): Promise<unknown> {
	const rawPayload = await response.text();
	if (!rawPayload) return null;

	const contentType = response.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		try {
			return JSON.parse(rawPayload) as unknown;
		} catch {
			return rawPayload;
		}
	}

	return rawPayload;
}

function readApiMessage(payload: unknown, fallback: string): string {
	if (payload && typeof payload === 'object') {
		const message = (payload as Record<string, unknown>).message;
		if (Array.isArray(message)) {
			const combined = message
				.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
				.join(', ');
			if (combined.length > 0) return combined;
		}

		if (typeof message === 'string' && message.trim().length > 0) {
			return message.trim();
		}
	}

	if (typeof payload === 'string' && payload.trim().length > 0) {
		return payload.trim();
	}

	return fallback;
}

function readProfileIdentity(record: Record<string, unknown> | null): OwnerIdentity {
	const profiles = record && isRecord(record.profiles) ? record.profiles : null;
	return {
		email:
			readOptionalString(record, 'email') ||
			readOptionalString(record, 'user_email') ||
			readOptionalString(profiles, 'email'),
		name:
			readOptionalString(record, 'name') ||
			readOptionalString(record, 'full_name') ||
			readOptionalString(profiles, 'full_name') ||
			readOptionalString(profiles, 'display_name')
	};
}

function buildLocationOwnerIdentityMap(location: unknown): Map<string, OwnerIdentity> {
	const identities = new Map<string, OwnerIdentity>();
	const locationRecord = isRecord(location) ? location : null;

	for (const owner of asRecordArray(locationRecord?.cw_location_owners)) {
		const userId = readOptionalString(owner, 'user_id');
		if (!userId) continue;

		const existing = identities.get(userId) ?? { email: '', name: '' };
		const profile = readProfileIdentity(owner);
		identities.set(userId, {
			email: profile.email || existing.email,
			name: profile.name || existing.name
		});
	}

	return identities;
}

function normalizeDeviceGroups(groups: string[], currentGroup: string): string[] {
	const normalized = new Set<string>();

	for (const group of groups) {
		const trimmed = group.trim();
		if (trimmed.length > 0) normalized.add(trimmed);
	}

	if (currentGroup.trim().length > 0) {
		normalized.add(currentGroup.trim());
	}

	return Array.from(normalized).sort((left, right) => left.localeCompare(right));
}

function normalizeDeviceOwners(
	device: unknown,
	locationOwnerIdentities: Map<string, OwnerIdentity>
): NormalizedDeviceOwner[] {
	const deviceRecord = isRecord(device) ? device : null;
	const owners = asRecordArray(deviceRecord?.cw_device_owners);

	return owners
		.map((owner, index) => {
			const userId = readOptionalString(owner, 'user_id');
			const locationOwnerIdentity = locationOwnerIdentities.get(userId);
			const ownerIdentity = readProfileIdentity(owner);
			const email =
				ownerIdentity.email ||
				readOptionalString(owner, 'targetUserEmail') ||
				locationOwnerIdentity?.email ||
				'';
			const name =
				ownerIdentity.name || locationOwnerIdentity?.name || userId || `User ${index + 1}`;
			const id = readOptionalNumber(owner, 'id') ?? index + 1;
			const permissionLevel = readOptionalNumber(owner, 'permission_level') ?? 4;

			return {
				id,
				key: email || userId || String(id),
				name,
				email,
				userId,
				permissionLevel
			} satisfies NormalizedDeviceOwner;
		})
		.sort((left, right) =>
			`${left.name} ${left.email} ${left.userId}`.localeCompare(
				`${right.name} ${right.email} ${right.userId}`
			)
		);
}

async function patchApi(
	fetchFn: typeof fetch,
	authToken: string,
	path: string,
	body: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
	const response = await fetchFn(`${PUBLIC_API_BASE_URL}${path}`, {
		method: 'PATCH',
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${authToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(body)
	});

	if (response.ok) {
		await parseResponsePayload(response);
		return { ok: true };
	}

	const payload = await parseResponsePayload(response);
	return {
		ok: false,
		status: response.status,
		message: readApiMessage(payload, 'The API rejected the update request.')
	};
}

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = String(params.dev_eui ?? '').trim();
	const locationId = Number.parseInt(params.location_id ?? '', 10);

	if (!authToken || !devEui) {
		return {
			devEui,
			deviceName: '',
			deviceGroup: '',
			deviceGroups: [] as string[],
			deviceOwners: [] as NormalizedDeviceOwner[]
		};
	}

	const api = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const [device, deviceGroups, location] = await Promise.all([
		api.getDevice(devEui).catch(() => null),
		api.getDeviceGroups().catch(() => []),
		Number.isFinite(locationId)
			? api.getLocation(locationId).catch(() => null)
			: Promise.resolve(null)
	]);

	const deviceRecord = isRecord(device) ? device : null;
	const locationOwnerIdentities = buildLocationOwnerIdentityMap(location);
	const deviceName = readOptionalString(deviceRecord, 'name') || devEui.toUpperCase();
	const deviceGroup = readOptionalString(deviceRecord, 'group');

	return {
		devEui,
		deviceName,
		deviceGroup,
		deviceGroups: normalizeDeviceGroups(deviceGroups, deviceGroup),
		deviceOwners: normalizeDeviceOwners(device, locationOwnerIdentities)
	};
};

export const actions: Actions = {
	updateDevice: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		const devEui = String(params.dev_eui ?? '').trim();

		if (!authToken) {
			return fail(401, {
				action: 'updateDevice',
				message: 'You must be logged in to update device settings.'
			});
		}

		if (!devEui) {
			return fail(400, {
				action: 'updateDevice',
				message: 'Invalid device id.'
			});
		}

		const formData = await request.formData();
		const values: DeviceFormValues = {
			name: readString(formData.get('name')),
			group: readString(formData.get('group'))
		};

		const fieldErrors: Partial<Record<keyof DeviceFormValues, string>> = {};

		if (!values.name) {
			fieldErrors.name = 'Device name is required.';
		} else if (values.name.length > DEVICE_NAME_MAX_LENGTH) {
			fieldErrors.name = `Device name must be ${DEVICE_NAME_MAX_LENGTH} characters or fewer.`;
		}

		if (values.group.length > DEVICE_GROUP_MAX_LENGTH) {
			fieldErrors.group = `Device group must be ${DEVICE_GROUP_MAX_LENGTH} characters or fewer.`;
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				action: 'updateDevice',
				message: 'Please correct the highlighted fields.',
				values,
				fieldErrors
			});
		}

		const response = await patchApi(fetch, authToken, `/devices/${encodeURIComponent(devEui)}`, {
			name: values.name,
			group: values.group || null
		});

		if (!response.ok) {
			return fail(response.status, {
				action: 'updateDevice',
				message: response.message,
				values,
				fieldErrors
			});
		}

		return {
			action: 'updateDevice',
			success: true,
			message: 'Device settings updated.'
		};
	},
	updateDeviceOwnerPermission: async ({ request, locals, fetch, params }) => {
		const authToken = locals.jwtString ?? null;
		const devEui = String(params.dev_eui ?? '').trim();

		if (!authToken) {
			return fail(401, {
				action: 'updateDeviceOwnerPermission',
				message: 'You must be logged in to update device owner permissions.'
			});
		}

		if (!devEui) {
			return fail(400, {
				action: 'updateDeviceOwnerPermission',
				message: 'Invalid device id.'
			});
		}

		const formData = await request.formData();
		const values: DeviceOwnerPermissionValues = {
			ownerKey: readString(formData.get('ownerKey')),
			targetUserEmail: readString(formData.get('targetUserEmail')),
			permissionLevel: readString(formData.get('permissionLevel'))
		};

		const fieldErrors: Partial<Record<keyof DeviceOwnerPermissionValues, string>> = {};
		const permissionLevel = Number.parseInt(values.permissionLevel, 10);

		if (!values.targetUserEmail) {
			fieldErrors.targetUserEmail = 'Owner email is required.';
		} else if (!EMAIL_PATTERN.test(values.targetUserEmail)) {
			fieldErrors.targetUserEmail = 'Owner email must be a valid email address.';
		}

		if (!Number.isFinite(permissionLevel) || !VALID_PERMISSION_LEVELS.has(permissionLevel)) {
			fieldErrors.permissionLevel = 'Choose a valid permission level.';
		}

		const ownerKey = values.ownerKey || values.targetUserEmail;

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				action: 'updateDeviceOwnerPermission',
				ownerKey,
				message: 'Please correct the highlighted fields.',
				values,
				fieldErrors
			});
		}

		const response = await patchApi(
			fetch,
			authToken,
			`/devices/${encodeURIComponent(devEui)}/permission-level`,
			{
				targetUserEmail: values.targetUserEmail,
				permissionLevel
			}
		);

		if (!response.ok) {
			return fail(response.status, {
				action: 'updateDeviceOwnerPermission',
				ownerKey,
				message: response.message,
				values,
				fieldErrors
			});
		}

		return {
			action: 'updateDeviceOwnerPermission',
			ownerKey,
			success: true,
			message: `Permission updated for ${values.targetUserEmail}.`
		};
	}
};
