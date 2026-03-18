import { env } from '$env/dynamic/private';
import {
	ApiService,
	ApiServiceError,
	type DeviceDto,
	type LocationDto
} from '$lib/api/api.service';
import { fail, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const DEVICE_NAME_MAX_LENGTH = 120;
const DEVICE_GROUP_MAX_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PERMISSION_LEVELS = new Set([1, 2, 3, 4]);

type DeviceFormValues = {
	name: string;
	group: string;
	location_id: number;
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

type SensorCertificateRow = {
	key: 'sensor' | 'sensor2';
	label: string;
	serial: string;
	product: string;
	downloadPath: string;
	downloadDisabledReason: string | null;
};

const readString = (value: FormDataEntryValue | null): string => {
	if (typeof value !== 'string') return '';
	return value.trim();
};

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

function str(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function readProfileIdentity(record: Record<string, unknown>): OwnerIdentity {
	const profiles = record.profiles as Record<string, unknown> | undefined;
	return {
		email: str(record.email) || str(record.user_email) || str(profiles?.email),
		name:
			str(record.name) ||
			str(record.full_name) ||
			str(profiles?.full_name) ||
			str(profiles?.display_name)
	};
}

function buildLocationOwnerIdentityMap(location: LocationDto | null): Map<string, OwnerIdentity> {
	const identities = new Map<string, OwnerIdentity>();
	const owners = location?.cw_location_owners ?? [];

	for (const owner of owners) {
		const userId = typeof owner.user_id === 'string' ? owner.user_id.trim() : '';
		if (!userId) continue;

		const existing = identities.get(userId) ?? { email: '', name: '' };
		const profile = readProfileIdentity(owner as Record<string, unknown>);
		identities.set(userId, {
			email: profile.email || existing.email,
			name: profile.name || existing.name
		});
	}

	return identities;
}

function normalizeDeviceOwners(
	device: DeviceDto | null,
	locationOwnerIdentities: Map<string, OwnerIdentity>
): NormalizedDeviceOwner[] {
	const owners = device?.cw_device_owners ?? [];

	return owners
		.map((owner, index) => {
			const userId = str(owner.user_id);
			const locationOwnerIdentity = locationOwnerIdentities.get(userId);
			const ownerIdentity = readProfileIdentity(owner);
			const email =
				ownerIdentity.email || str(owner.targetUserEmail) || locationOwnerIdentity?.email || '';
			const name =
				ownerIdentity.name || locationOwnerIdentity?.name || userId || `User ${index + 1}`;
			const rawId = owner.id;
			const id = typeof rawId === 'number' && Number.isFinite(rawId) ? rawId : index + 1;
			const rawPerm = owner.permission_level;
			const permissionLevel = typeof rawPerm === 'number' && Number.isFinite(rawPerm) ? rawPerm : 4;

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

function buildSensorCertificateRows(device: DeviceDto | null): SensorCertificateRow[] {
	if (!device) return [];

	const product = str(device.cw_device_type?.model);
	const hasApiToken = str(env.PRIVATE_LIBELLUS_API_TOKEN).length > 0;
	const hasBaseUrl = str(env.PRIVATE_LIBELLUS_BASE_URL).length > 0;
	const record = device as Record<string, unknown>;
	const rows = [
		{
			key: 'sensor' as const,
			label: 'Sensor 1',
			serial: str(record.sensor1_serial) || str(record.sensor_serial)
		},
		{
			key: 'sensor2' as const,
			label: 'Sensor 2',
			serial: str(record.sensor2_serial)
		}
	];

	return rows
		.filter((row) => row.serial.length > 0)
		.map((row) => ({
			...row,
			product,
			downloadPath: `libellus-certificates/${row.key}`,
			downloadDisabledReason: !hasApiToken
				? 'PRIVATE_LIBELLUS_API_TOKEN is not configured.'
				: !hasBaseUrl
					? 'PRIVATE_LIBELLUS_BASE_URL is not configured.'
					: !product
						? 'cw_device_type.model is missing, so Libellus product_name is unknown.'
						: null
		}));
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
			sensorCertificates: [] as SensorCertificateRow[],
			deviceOwners: [] as NormalizedDeviceOwner[]
		};
	}

	const api = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const [device, deviceGroups, location, locations] = await Promise.all([
		api.getDevice(devEui).catch(() => null),
		api.getDeviceGroups().catch(() => []),
		Number.isFinite(locationId)
			? api.getLocation(locationId).catch(() => null)
			: Promise.resolve(null),
		api.getLocations().catch(() => [])
	]);

	const locationOwnerIdentities = buildLocationOwnerIdentityMap(location);
	const deviceName = device?.name || devEui.toUpperCase();
	const sensorCertificates = buildSensorCertificateRows(device);

	return {
		devEui,
		deviceName,
		location_id: device?.location_id,
		deviceGroup: device?.group || '',
		deviceGroups,
		locations,
		sensorCertificates,
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
			group: readString(formData.get('group')),
			location_id: Number.parseInt(readString(formData.get('location_id')), 10)
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

		if (!values.location_id) {
			fieldErrors.location_id = 'Location is required.';
		}

		if (Object.keys(fieldErrors).length > 0) {
			return fail(400, {
				action: 'updateDevice',
				message: 'Please correct the highlighted fields.',
				values,
				fieldErrors
			});
		}

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			console.log('Updating device with values:', { devEui, ...values });
			await api.updateDevice(devEui, {
				name: values.name,
				group: values.group || null,
				location_id: +values.location_id
			});
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'updateDevice',
				message: readApiMessage(
					error instanceof ApiServiceError ? error.payload : error,
					'The API rejected the update request.'
				),
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

		const api = new ApiService({
			fetchFn: fetch,
			authToken
		});

		try {
			await api.updateDevicePermissionLevel(devEui, {
				targetUserEmail: values.targetUserEmail,
				permissionLevel
			});
		} catch (error) {
			return fail(error instanceof ApiServiceError ? error.status : 502, {
				action: 'updateDeviceOwnerPermission',
				ownerKey,
				message: readApiMessage(
					error instanceof ApiServiceError ? error.payload : error,
					'The API rejected the permission update request.'
				),
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
