import { env } from '$env/dynamic/private';
import type { DeviceDto, LocationDto } from '$lib/api/api.service';
import {
	isValidTtiDeviceId,
	normalizeTtiDeviceId,
	TTI_DEVICE_ID_MAX_LENGTH
} from '$lib/devices/tti-device-id';
import { m } from '$lib/paraglide/messages.js';

export const DEVICE_NAME_MAX_LENGTH = 120;
export const DEVICE_GROUP_MAX_LENGTH = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_PERMISSION_LEVELS = new Set([1, 2, 3, 4]);

export type DeviceFormValues = {
	name: string;
	group: string;
	location_id: number;
	tti_name: string;
};

export type DeviceOwnerPermissionValues = {
	ownerKey: string;
	targetUserEmail: string;
	permissionLevel: string;
};

type OwnerIdentity = {
	email: string;
	name: string;
};

export type NormalizedDeviceOwner = {
	id: number;
	key: string;
	name: string;
	email: string;
	userId: string;
	permissionLevel: number;
};

export type SensorCertificateRow = {
	key: 'sensor' | 'sensor2';
	label: string;
	serial: string;
	product: string;
	downloadDisabledReason: string | null;
};

export const readString = (value: FormDataEntryValue | null): string => {
	if (typeof value !== 'string') return '';
	return value.trim();
};

export function str(value: unknown): string {
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

export function buildLocationOwnerIdentityMap(
	location: LocationDto | null
): Map<string, OwnerIdentity> {
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

export function normalizeDeviceOwners(
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
				ownerIdentity.name ||
				locationOwnerIdentity?.name ||
				userId ||
				m.devices_owner_fallback_name({ index: String(index + 1) });
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

export function buildSensorCertificateRows(device: DeviceDto | null): SensorCertificateRow[] {
	if (!device) return [];

	const product = str(device.cw_device_type?.model);
	const hasApiToken = str(env.PRIVATE_LIBELLUS_API_TOKEN).length > 0;
	const hasBaseUrl = str(env.PRIVATE_LIBELLUS_BASE_URL).length > 0;
	const record = device as Record<string, unknown>;
	const rows = [
		{
			key: 'sensor' as const,
			label: m.devices_sensor_one(),
			serial: str(record.sensor1_serial) || str(record.sensor_serial)
		},
		{
			key: 'sensor2' as const,
			label: m.devices_sensor_two(),
			serial: str(record.sensor2_serial)
		}
	];

	return rows
		.filter((row) => row.serial.length > 0)
		.map((row) => ({
			...row,
			product,
			downloadDisabledReason:
				row.key !== 'sensor'
					? null
					: !hasApiToken
						? m.devices_libellus_api_token_missing()
						: !hasBaseUrl
							? m.devices_libellus_base_url_missing()
							: !product
								? m.devices_libellus_product_name_missing()
								: null
		}));
}

export function readDeviceFormValues(formData: FormData): DeviceFormValues {
	return {
		name: readString(formData.get('name')),
		group: readString(formData.get('group')),
		location_id: Number.parseInt(readString(formData.get('location_id')), 10),
		tti_name: normalizeTtiDeviceId(readString(formData.get('tti_name')))
	};
}

export function validateDeviceFormValues(
	values: DeviceFormValues
): Partial<Record<keyof DeviceFormValues, string>> {
	const fieldErrors: Partial<Record<keyof DeviceFormValues, string>> = {};

	if (!values.name) {
		fieldErrors.name = m.devices_device_name_required();
	} else if (values.name.length > DEVICE_NAME_MAX_LENGTH) {
		fieldErrors.name = m.devices_device_name_length({ max: String(DEVICE_NAME_MAX_LENGTH) });
	}

	if (values.group.length > DEVICE_GROUP_MAX_LENGTH) {
		fieldErrors.group = m.devices_device_group_length({
			max: String(DEVICE_GROUP_MAX_LENGTH)
		});
	}

	if (
		values.tti_name.length > TTI_DEVICE_ID_MAX_LENGTH ||
		(values.tti_name.length > 0 && !isValidTtiDeviceId(values.tti_name))
	) {
		fieldErrors.tti_name = m.devices_tti_device_id_invalid();
	}

	if (!values.location_id) {
		fieldErrors.location_id = m.devices_location_required();
	}

	return fieldErrors;
}

export function readDeviceOwnerPermissionValues(formData: FormData): DeviceOwnerPermissionValues {
	return {
		ownerKey: readString(formData.get('ownerKey')),
		targetUserEmail: readString(formData.get('targetUserEmail')),
		permissionLevel: readString(formData.get('permissionLevel'))
	};
}

export function validateDeviceOwnerPermissionValues(values: DeviceOwnerPermissionValues): {
	fieldErrors: Partial<Record<keyof DeviceOwnerPermissionValues, string>>;
	permissionLevel: number;
} {
	const fieldErrors: Partial<Record<keyof DeviceOwnerPermissionValues, string>> = {};
	const permissionLevel = Number.parseInt(values.permissionLevel, 10);

	if (!values.targetUserEmail) {
		fieldErrors.targetUserEmail = m.devices_owner_email_required();
	} else if (!EMAIL_PATTERN.test(values.targetUserEmail)) {
		fieldErrors.targetUserEmail = m.devices_owner_email_invalid();
	}

	if (!Number.isFinite(permissionLevel) || !VALID_PERMISSION_LEVELS.has(permissionLevel)) {
		fieldErrors.permissionLevel = m.devices_choose_valid_permission_level();
	}

	return { fieldErrors, permissionLevel };
}
