import { describe, expect, it } from 'vitest';
import type { DeviceDto, LocationDto } from '$lib/api/api.dtos';
import { PermissionLevel } from '$lib/constants/permissions';
import { TTI_DEVICE_ID_MAX_LENGTH } from '$lib/devices/tti-device-id';
import { m } from '$lib/paraglide/messages.js';
import {
	buildLocationOwnerIdentityMap,
	buildSensorCertificateRows,
	DEVICE_GROUP_MAX_LENGTH,
	DEVICE_NAME_MAX_LENGTH,
	deviceSupportsSensorCertificate,
	getSht43Serial,
	normalizeDeviceOwners,
	readDeviceFormValues,
	readDeviceOwnerPermissionValues,
	readString,
	str,
	validateDeviceFormValues,
	validateDeviceOwnerPermissionValues
} from './device-settings.server';

const CROPWATCH_AIR = { id: 1, name: 'Air', model: 'CW-AIR', manufacturer: 'CropWatch' };

const device = (overrides: Record<string, unknown> = {}) =>
	({
		dev_eui: 'DEV-1',
		name: 'Air sensor',
		cw_device_type: CROPWATCH_AIR,
		...overrides
	}) as DeviceDto;

const location = (owners: unknown[] | undefined) =>
	({
		location_id: 8,
		name: 'North field',
		created_at: '',
		cw_location_owners: owners
	}) as LocationDto;

function formData(fields: Record<string, string>): FormData {
	const data = new FormData();
	for (const [name, value] of Object.entries(fields)) data.set(name, value);
	return data;
}

describe('readString and str', () => {
	it('trim strings and turn anything else into an empty string', () => {
		expect(readString('  a b  ')).toBe('a b');
		expect(readString(null)).toBe('');
		expect(readString(new File(['x'], 'x.txt'))).toBe('');
		expect(str('  x ')).toBe('x');
		expect(str(42)).toBe('');
		expect(str(undefined)).toBe('');
	});
});

describe('buildLocationOwnerIdentityMap', () => {
	it('is empty without a location or owners', () => {
		expect(buildLocationOwnerIdentityMap(null).size).toBe(0);
		expect(buildLocationOwnerIdentityMap(location(undefined)).size).toBe(0);
	});

	it("maps each owner's user id to the email and name on the owner or its profile", () => {
		const identities = buildLocationOwnerIdentityMap(
			location([
				{ user_id: ' u-1 ', email: ' ada@example.com ', name: ' Ada ' },
				{ user_id: 'u-2', user_email: 'bob@example.com', full_name: 'Bob' },
				{ user_id: 'u-3', profiles: { email: 'cy@example.com', full_name: 'Cy' } },
				{ user_id: 'u-4', profiles: { display_name: 'Dee' } },
				{ user_id: 'u-5' }
			])
		);

		expect([...identities]).toEqual([
			['u-1', { email: 'ada@example.com', name: 'Ada' }],
			['u-2', { email: 'bob@example.com', name: 'Bob' }],
			['u-3', { email: 'cy@example.com', name: 'Cy' }],
			['u-4', { email: '', name: 'Dee' }],
			['u-5', { email: '', name: '' }]
		]);
	});

	it('skips owners without a user id and merges repeated ones, keeping what is known', () => {
		const identities = buildLocationOwnerIdentityMap(
			location([
				{ user_id: '  ', email: 'blank@example.com' },
				{ user_id: 42, email: 'number@example.com' },
				{ user_id: 'u-1', email: 'ada@example.com' },
				{ user_id: 'u-1', name: 'Ada' },
				{ user_id: 'u-1', email: 'ada.new@example.com' }
			])
		);

		expect([...identities]).toEqual([['u-1', { email: 'ada.new@example.com', name: 'Ada' }]]);
	});
});

describe('normalizeDeviceOwners', () => {
	it('is empty without a device or owners', () => {
		expect(normalizeDeviceOwners(null, new Map())).toEqual([]);
		expect(normalizeDeviceOwners(device(), new Map())).toEqual([]);
	});

	it("takes each owner's identity from the owner first, then from the location's owners", () => {
		const identities = new Map([
			['u-2', { email: 'bob@location.example', name: 'Bob (location)' }],
			['u-3', { email: 'cy@location.example', name: 'Cy (location)' }]
		]);

		const owners = normalizeDeviceOwners(
			device({
				cw_device_owners: [
					{ id: 9, user_id: 'u-3', permission_level: 4 },
					{ id: 8, user_id: 'u-2', targetUserEmail: ' bob@target.example ', permission_level: 3 },
					{ id: 7, user_id: 'u-1', email: 'ada@example.com', name: 'Ada', permission_level: 1 },
					{
						id: 6,
						user_id: 'u-4',
						profiles: { email: 'dee@example.com', display_name: 'Dee' },
						permission_level: 2
					}
				]
			}),
			identities
		);

		expect(owners).toEqual([
			{
				id: 7,
				key: 'ada@example.com',
				name: 'Ada',
				email: 'ada@example.com',
				userId: 'u-1',
				permissionLevel: 1
			},
			{
				id: 8,
				key: 'bob@target.example',
				name: 'Bob (location)',
				email: 'bob@target.example',
				userId: 'u-2',
				permissionLevel: 3
			},
			{
				id: 9,
				key: 'cy@location.example',
				name: 'Cy (location)',
				email: 'cy@location.example',
				userId: 'u-3',
				permissionLevel: 4
			},
			{
				id: 6,
				key: 'dee@example.com',
				name: 'Dee',
				email: 'dee@example.com',
				userId: 'u-4',
				permissionLevel: 2
			}
		]);
	});

	it('names an owner without an identity by its user id, keyed by it', () => {
		expect(
			normalizeDeviceOwners(
				device({ cw_device_owners: [{ id: 3, user_id: 'u-9', permission_level: 2 }] }),
				new Map()
			)
		).toEqual([{ id: 3, key: 'u-9', name: 'u-9', email: '', userId: 'u-9', permissionLevel: 2 }]);
	});

	it('falls back to a numbered name, the row number as id and key, and DISABLED', () => {
		expect(
			normalizeDeviceOwners(
				device({
					cw_device_owners: [
						{ id: 4, user_id: 'u-1', email: 'ada@example.com', permission_level: 1 },
						{ id: Number.NaN, permission_level: '2' }
					]
				}),
				new Map()
			).find((owner) => owner.userId === '')
		).toEqual({
			id: 2,
			key: '2',
			name: m.devices_owner_fallback_name({ index: '2' }),
			email: '',
			userId: '',
			permissionLevel: PermissionLevel.DISABLED
		});
		expect(
			normalizeDeviceOwners(
				device({
					cw_device_owners: [{ user_id: 'u-1', permission_level: Number.POSITIVE_INFINITY }]
				}),
				new Map()
			)
		).toEqual([
			{
				id: 1,
				key: 'u-1',
				name: 'u-1',
				email: '',
				userId: 'u-1',
				permissionLevel: PermissionLevel.DISABLED
			}
		]);
	});

	it('sorts owners by name, then email, then user id', () => {
		const owners = normalizeDeviceOwners(
			device({
				cw_device_owners: [
					{ id: 1, user_id: 'u-b', email: 'b@example.com', name: 'Same', permission_level: 3 },
					{ id: 2, user_id: 'u-c', email: 'a@example.com', name: 'Same', permission_level: 3 },
					{ id: 3, user_id: 'u-a', email: 'z@example.com', name: 'Alpha', permission_level: 3 }
				]
			}),
			new Map()
		);

		expect(owners.map((owner) => owner.id)).toEqual([3, 2, 1]);
	});
});

describe('sensor certificates', () => {
	it('are offered only for devices made by CropWatch', () => {
		expect(deviceSupportsSensorCertificate(device())).toBe(true);
		expect(
			deviceSupportsSensorCertificate(device({ cw_device_type: { manufacturer: ' CropWatch ' } }))
		).toBe(true);
		expect(
			deviceSupportsSensorCertificate(device({ cw_device_type: { manufacturer: 'Seeed' } }))
		).toBe(false);
		expect(deviceSupportsSensorCertificate(device({ cw_device_type: undefined }))).toBe(false);
		expect(deviceSupportsSensorCertificate(null)).toBe(false);
	});

	it("use the SHT43's serial, stored as sensor2_serial", () => {
		expect(getSht43Serial(device({ sensor1_serial: 'SHT40-1', sensor2_serial: ' SHT43-1 ' }))).toBe(
			'SHT43-1'
		);
		expect(getSht43Serial(device())).toBe('');
		expect(getSht43Serial(null)).toBe('');
	});

	it('list the SHT43 with its serial and model, downloadable when Libellus is configured', () => {
		expect(buildSensorCertificateRows(device({ sensor2_serial: 'SN-43' }), null)).toEqual([
			{
				key: 'sensor',
				label: m.devices_sensor_sht43_label(),
				serial: 'SN-43',
				product: 'CW-AIR',
				downloadDisabledReason: null
			}
		]);
	});

	it('say why the download is disabled when Libellus is not configured', () => {
		const sensor = device({
			sensor2_serial: 'SN-43',
			cw_device_type: { manufacturer: 'CropWatch' }
		});

		expect(buildSensorCertificateRows(sensor, 'missing-api-token')).toEqual([
			expect.objectContaining({
				product: '',
				downloadDisabledReason: m.devices_libellus_api_token_missing()
			})
		]);
		expect(buildSensorCertificateRows(sensor, 'missing-base-url')).toEqual([
			expect.objectContaining({ downloadDisabledReason: m.devices_libellus_base_url_missing() })
		]);
	});

	it('list nothing for other devices or without an SHT43 serial', () => {
		expect(
			buildSensorCertificateRows(
				device({ sensor2_serial: 'SN-43', cw_device_type: { manufacturer: 'Seeed' } }),
				null
			)
		).toEqual([]);
		expect(buildSensorCertificateRows(device({ sensor2_serial: '  ' }), null)).toEqual([]);
		expect(buildSensorCertificateRows(null, 'missing-api-token')).toEqual([]);
	});
});

describe('device form', () => {
	it('reads trimmed values, a numeric location and a normalized TTI device id', () => {
		expect(
			readDeviceFormValues(
				formData({
					name: ' Air sensor ',
					group: ' Barn ',
					location_id: ' 8 ',
					tti_name: ' CW-Air '
				})
			)
		).toEqual({ name: 'Air sensor', group: 'Barn', location_id: 8, tti_name: 'cw-air' });
		expect(readDeviceFormValues(new FormData())).toEqual({
			name: '',
			group: '',
			location_id: Number.NaN,
			tti_name: ''
		});
	});

	it('accepts a complete form, with or without a group and TTI device id', () => {
		expect(
			validateDeviceFormValues({ name: 'Air', group: '', location_id: 8, tti_name: '' })
		).toEqual({});
		expect(
			validateDeviceFormValues({
				name: 'x'.repeat(DEVICE_NAME_MAX_LENGTH),
				group: 'g'.repeat(DEVICE_GROUP_MAX_LENGTH),
				location_id: 8,
				tti_name: 'cw-air-01'
			})
		).toEqual({});
	});

	it('requires a name and a location', () => {
		expect(
			validateDeviceFormValues({ name: '', group: '', location_id: Number.NaN, tti_name: '' })
		).toEqual({
			name: m.devices_device_name_required(),
			location_id: m.devices_location_required()
		});
	});

	it('flags values that are too long or not a TTI device id', () => {
		expect(
			validateDeviceFormValues({
				name: 'x'.repeat(DEVICE_NAME_MAX_LENGTH + 1),
				group: 'g'.repeat(DEVICE_GROUP_MAX_LENGTH + 1),
				location_id: 0,
				tti_name: 'Not Valid'
			})
		).toEqual({
			name: m.devices_device_name_length({ max: String(DEVICE_NAME_MAX_LENGTH) }),
			group: m.devices_device_group_length({ max: String(DEVICE_GROUP_MAX_LENGTH) }),
			tti_name: m.devices_tti_device_id_invalid(),
			location_id: m.devices_location_required()
		});
		expect(
			validateDeviceFormValues({
				name: 'Air',
				group: '',
				location_id: 8,
				tti_name: 'a'.repeat(TTI_DEVICE_ID_MAX_LENGTH + 1)
			})
		).toEqual({ tti_name: m.devices_tti_device_id_invalid() });
	});
});

describe('owner permission form', () => {
	it('reads trimmed values', () => {
		expect(
			readDeviceOwnerPermissionValues(
				formData({ ownerKey: ' k ', targetUserEmail: ' ada@example.com ', permissionLevel: ' 3 ' })
			)
		).toEqual({ ownerKey: 'k', targetUserEmail: 'ada@example.com', permissionLevel: '3' });
		expect(readDeviceOwnerPermissionValues(new FormData())).toEqual({
			ownerKey: '',
			targetUserEmail: '',
			permissionLevel: ''
		});
	});

	it('accepts an email with a permission level from 1 to 5', () => {
		for (const level of [1, 2, 3, 4, 5]) {
			expect(
				validateDeviceOwnerPermissionValues({
					ownerKey: '',
					targetUserEmail: 'ada@example.com',
					permissionLevel: String(level)
				})
			).toEqual({ fieldErrors: {}, permissionLevel: level });
		}
	});

	it('flags a missing or malformed email and an unknown level', () => {
		expect(
			validateDeviceOwnerPermissionValues({
				ownerKey: '',
				targetUserEmail: '',
				permissionLevel: ''
			})
		).toEqual({
			fieldErrors: {
				targetUserEmail: m.devices_owner_email_required(),
				permissionLevel: m.devices_choose_valid_permission_level()
			},
			permissionLevel: Number.NaN
		});
		expect(
			validateDeviceOwnerPermissionValues({
				ownerKey: '',
				targetUserEmail: 'not-an-email',
				permissionLevel: '6'
			})
		).toEqual({
			fieldErrors: {
				targetUserEmail: m.devices_owner_email_invalid(),
				permissionLevel: m.devices_choose_valid_permission_level()
			},
			permissionLevel: 6
		});
	});
});
