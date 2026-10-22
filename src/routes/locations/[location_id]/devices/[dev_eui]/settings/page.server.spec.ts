import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { BillingLicense, DeviceDto, LocationDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import type { FetchFn } from '$lib/api/http/fetch-http-client';
import { m } from '$lib/paraglide/messages.js';
import { readServerConfig, type EnvSource } from '$lib/server/config';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	formRequest,
	TEST_JWT,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['updateDevice']>[0];

const PARAMS = { location_id: '8', dev_eui: 'DEV-1' };

const DEVICE = {
	dev_eui: 'DEV-1',
	name: 'Air sensor',
	group: 'Barn',
	location_id: 8,
	tti_name: ' CW-Air-01 ',
	user_id: 'owner-1',
	org_id: 'org-1',
	sensor2_serial: 'SN-43',
	cw_device_type: { id: 1, name: 'Air', model: 'CW-AIR', manufacturer: 'CropWatch' },
	cw_device_owners: [
		{ id: 3, dev_eui: 'DEV-1', user_id: 'user-2', permission_level: 3 },
		{
			id: 2,
			dev_eui: 'DEV-1',
			user_id: 'user-1',
			permission_level: 1,
			email: 'ada@example.com',
			name: 'Ada'
		}
	]
} as unknown as DeviceDto;

const LOCATION = {
	location_id: 8,
	name: 'North field',
	cw_location_owners: [
		{ user_id: 'user-2', profiles: { email: 'bob@example.com', full_name: 'Bob' } }
	]
} as unknown as LocationDto;

const license = (overrides: Partial<BillingLicense>): BillingLicense => ({
	id: 1,
	seatIndex: 0,
	status: 'assigned',
	devEui: null,
	deviceName: null,
	manual: false,
	...overrides
});

const LICENSES = [
	license({ id: 4, devEui: 'OTHER' }),
	license({ id: 6, status: 'unassigned' }),
	license({ id: 5, seatIndex: 2, devEui: 'dev-1', manual: true })
];

const ADA = {
	id: 2,
	key: 'ada@example.com',
	name: 'Ada',
	email: 'ada@example.com',
	userId: 'user-1',
	permissionLevel: 1
};

/** What the page gets when it cannot show a device. */
const nothing = (devEui: string) => ({
	devEui,
	deviceName: '',
	deviceGroup: '',
	ttiName: '',
	sensorCertificates: [],
	supportsSensorCertificates: false,
	deviceOwners: [],
	license: null,
	deviceOwnerId: null,
	deviceOrgId: null
});

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: { message } });

/** `locals` whose services are the real ones, over a fake API. */
function realLocals(fetch: FetchFn, serverConfig = testServerConfig()): TestLocals {
	const services = createServerServices({
		fetch,
		authToken: () => TEST_JWT,
		config: testPublicConfig(),
		serverConfig
	});
	return { ...testLocals(), services } as unknown as TestLocals;
}

function stubLoad(locals: TestLocals) {
	const { locations, billing } = locals.services;
	locations.getLocation.mockResolvedValue(LOCATION);
	locations.getLocations.mockResolvedValue([LOCATION]);
	billing.getLicenses.mockResolvedValue(LICENSES);
	return locals;
}

async function runLoad(
	parent: Record<string, unknown>,
	locals: TestLocals = stubLoad(testLocals()),
	params: Record<string, string> = PARAMS
) {
	// The load always returns data; `PageServerLoad` also allows `void`.
	return (await load(testEvent<LoadEvent>({ locals, params, parent }))) as Exclude<
		Awaited<ReturnType<typeof load>>,
		void
	>;
}

function act(
	name: string,
	locals: TestLocals,
	fields: Record<string, string> = {},
	params: Record<string, string> = PARAMS
) {
	return actions[name](testEvent<ActionEvent>({ locals, params, request: formRequest(fields) }));
}

beforeEach(() => {
	// The real HTTP client logs every refused request.
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('device settings load', () => {
	it('builds every settings card from the layout device and the three lookups', async () => {
		const locals = stubLoad(testLocals());

		await expect(runLoad({ authToken: TEST_JWT, device: DEVICE }, locals)).resolves.toEqual({
			devEui: 'DEV-1',
			deviceName: 'Air sensor',
			location_id: 8,
			deviceGroup: 'Barn',
			ttiName: 'cw-air-01',
			locations: [LOCATION],
			sensorCertificates: [
				{
					key: 'sensor',
					label: m.devices_sensor_sht43_label(),
					serial: 'SN-43',
					product: 'CW-AIR',
					downloadDisabledReason: null
				}
			],
			supportsSensorCertificates: true,
			deviceOwners: [
				ADA,
				{
					id: 3,
					key: 'bob@example.com',
					name: 'Bob',
					email: 'bob@example.com',
					userId: 'user-2',
					permissionLevel: 3
				}
			],
			license: { id: 5, seatIndex: 2, manual: true },
			deviceOwnerId: 'owner-1',
			deviceOrgId: 'org-1'
		});
		expect(locals.services.locations.getLocation).toHaveBeenCalledWith(8);
		expect(locals.services.locations.getLocations).toHaveBeenCalledWith();
		expect(locals.services.billing.getLicenses).toHaveBeenCalledWith();
		// The device itself comes from the layout.
		expect(locals.services.devices.getDevice).not.toHaveBeenCalled();
		// The page offers no group list, so the device groups are not fetched.
		expect(locals.services.devices.getDeviceGroups).not.toHaveBeenCalled();
	});

	it("explains a disabled certificate download with Libellus's configuration problem", async () => {
		for (const [problem, reason] of [
			['missing-api-token', m.devices_libellus_api_token_missing()],
			['missing-base-url', m.devices_libellus_base_url_missing()]
		] as const) {
			const locals = stubLoad(testLocals());
			locals.services.libellus.configurationProblem = problem;

			const data = await runLoad({ authToken: TEST_JWT, device: DEVICE }, locals);

			expect(data.sensorCertificates).toEqual([
				expect.objectContaining({ serial: 'SN-43', downloadDisabledReason: reason })
			]);
		}
	});

	it.each([
		[{}, m.devices_libellus_api_token_missing()],
		[
			{ PRIVATE_LIBELLUS_API_TOKEN: '  ', PRIVATE_LIBELLUS_BASE_URL: 'https://libellus.test' },
			m.devices_libellus_api_token_missing()
		],
		[{ PRIVATE_LIBELLUS_API_TOKEN: 'token' }, m.devices_libellus_base_url_missing()],
		[
			{ PRIVATE_LIBELLUS_API_TOKEN: 'token', PRIVATE_LIBELLUS_BASE_URL: ' ' },
			m.devices_libellus_base_url_missing()
		],
		[{ PRIVATE_LIBELLUS_API_TOKEN: ' token ', PRIVATE_LIBELLUS_BASE_URL: 'https://l.test' }, null]
	] as Array<[EnvSource, string | null]>)(
		'reads a trimmed Libellus token, then base URL, from the env (%j)',
		async (env, reason) => {
			const fake = createFakeFetch(() => jsonResponse([]));
			const locals = realLocals(fake.fetch, readServerConfig(env, {}));

			const data = await runLoad({ authToken: TEST_JWT, device: DEVICE }, locals);

			expect(data.sensorCertificates).toEqual([
				expect.objectContaining({ downloadDisabledReason: reason })
			]);
		}
	);

	it('degrades each lookup on its own when the API fails', async () => {
		const locals = testLocals();
		locals.services.locations.getLocation.mockRejectedValue(apiError(403, 'Forbidden'));
		locals.services.locations.getLocations.mockRejectedValue(new TypeError('Failed to fetch'));
		locals.services.billing.getLicenses.mockRejectedValue(apiError(402, 'No billing'));

		await expect(runLoad({ authToken: TEST_JWT, device: DEVICE }, locals)).resolves.toMatchObject({
			locations: [],
			license: null,
			// Without the location, Bob is known by his user id only.
			deviceOwners: [
				ADA,
				{ id: 3, key: 'user-2', name: 'user-2', email: '', userId: 'user-2', permissionLevel: 3 }
			]
		});
	});

	it('has no license summary when no license is on this device', async () => {
		const locals = stubLoad(testLocals());
		locals.services.billing.getLicenses.mockResolvedValue([LICENSES[0], LICENSES[1]]);

		await expect(runLoad({ authToken: TEST_JWT, device: DEVICE }, locals)).resolves.toMatchObject({
			license: null
		});
	});

	it('does not look up a location id that is not a number', async () => {
		const cases: Array<Record<string, string>> = [
			{ location_id: 'north', dev_eui: 'DEV-1' },
			{ dev_eui: 'DEV-1' }
		];
		for (const params of cases) {
			const locals = stubLoad(testLocals());

			const data = await runLoad({ authToken: TEST_JWT, device: DEVICE }, locals, params);

			expect(locals.services.locations.getLocation).not.toHaveBeenCalled();
			expect(data.deviceOwners).toContainEqual(expect.objectContaining({ name: 'user-2' }));
		}
	});

	it('falls back to the DevEUI as the name when the layout has no device', async () => {
		await expect(
			runLoad({ authToken: TEST_JWT, device: null }, undefined, {
				location_id: '8',
				dev_eui: ' dev-1 '
			})
		).resolves.toEqual({
			devEui: 'dev-1',
			deviceName: 'DEV-1',
			location_id: undefined,
			deviceGroup: '',
			ttiName: '',
			locations: [LOCATION],
			sensorCertificates: [],
			supportsSensorCertificates: false,
			deviceOwners: [],
			license: { id: 5, seatIndex: 2, manual: true },
			deviceOwnerId: null,
			deviceOrgId: null
		});
	});

	it('uses the DevEUI for an unnamed device and ignores owner and org ids that are not strings', async () => {
		const unnamed = { ...DEVICE, name: '', group: null, user_id: null, org_id: 7 };

		await expect(runLoad({ authToken: TEST_JWT, device: unnamed })).resolves.toMatchObject({
			deviceName: 'DEV-1',
			deviceGroup: '',
			deviceOwnerId: null,
			deviceOrgId: null
		});
	});

	it('loads nothing without a session or a DevEUI', async () => {
		const signedOut = stubLoad(testLocals());
		await expect(runLoad({ authToken: null, device: DEVICE }, signedOut)).resolves.toEqual(
			nothing('DEV-1')
		);
		await expect(runLoad({ device: DEVICE }, signedOut)).resolves.toEqual(nothing('DEV-1'));

		const noDevEui = stubLoad(testLocals());
		await expect(
			runLoad({ authToken: TEST_JWT, device: DEVICE }, noDevEui, { location_id: '8', dev_eui: ' ' })
		).resolves.toEqual(nothing(''));
		await expect(
			runLoad({ authToken: TEST_JWT, device: DEVICE }, noDevEui, { location_id: '8' })
		).resolves.toEqual(nothing(''));

		for (const locals of [signedOut, noDevEui]) {
			expect(locals.services.locations.getLocations).not.toHaveBeenCalled();
			expect(locals.services.billing.getLicenses).not.toHaveBeenCalled();
		}
	});

	it('sends its three lookups as the session through the request-scoped services', async () => {
		const fake = createFakeFetch(({ path }) => {
			switch (path) {
				case '/locations/8':
					return jsonResponse(LOCATION);
				case '/locations':
					return jsonResponse([LOCATION]);
				case '/payments/licenses':
					return jsonResponse(LICENSES);
				default:
					return jsonResponse({ message: 'unexpected' }, { status: 404 });
			}
		});

		await expect(
			runLoad({ authToken: TEST_JWT, device: DEVICE }, realLocals(fake.fetch))
		).resolves.toMatchObject({
			locations: [LOCATION],
			license: { id: 5, seatIndex: 2, manual: true },
			deviceOwners: [ADA, expect.objectContaining({ name: 'Bob' })]
		});
		// No GET /devices/groups: the page never used it.
		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /locations/8',
			'GET /locations',
			'GET /payments/licenses'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});

describe('updateDevice', () => {
	const FIELDS = {
		name: ' Air sensor ',
		group: ' Barn ',
		location_id: '8',
		tti_name: ' CW-Air-01 '
	};
	const VALUES = { name: 'Air sensor', group: 'Barn', location_id: 8, tti_name: 'cw-air-01' };

	it('saves the trimmed fields', async () => {
		const locals = testLocals();
		locals.services.devices.updateDevice.mockResolvedValue({});

		await expect(act('updateDevice', locals, FIELDS)).resolves.toEqual({
			action: 'updateDevice',
			success: true,
			message: m.devices_settings_updated()
		});
		expect(locals.services.devices.updateDevice).toHaveBeenCalledWith('DEV-1', VALUES);
	});

	it('clears an empty group and TTI device id', async () => {
		const locals = testLocals();
		locals.services.devices.updateDevice.mockResolvedValue(null);

		await act('updateDevice', locals, { name: 'Air', group: ' ', location_id: '8', tti_name: '' });

		expect(locals.services.devices.updateDevice).toHaveBeenCalledWith('DEV-1', {
			name: 'Air',
			group: null,
			location_id: 8,
			tti_name: null
		});
	});

	it('returns the field errors with the values, without saving', async () => {
		const locals = testLocals();

		await expect(
			act('updateDevice', locals, { name: '', group: '', location_id: '', tti_name: 'Not Valid' })
		).resolves.toEqual({
			status: 400,
			data: {
				action: 'updateDevice',
				message: m.validation_correct_highlighted_fields(),
				values: { name: '', group: '', location_id: Number.NaN, tti_name: 'not valid' },
				fieldErrors: {
					name: m.devices_device_name_required(),
					tti_name: m.devices_tti_device_id_invalid(),
					location_id: m.devices_location_required()
				}
			}
		});
		expect(locals.services.devices.updateDevice).not.toHaveBeenCalled();
	});

	it("returns the API's status and message, keeping the values", async () => {
		const locals = testLocals();
		locals.services.devices.updateDevice.mockRejectedValue(apiError(409, 'Name already used'));

		await expect(act('updateDevice', locals, FIELDS)).resolves.toEqual({
			status: 409,
			data: {
				action: 'updateDevice',
				message: 'Name already used',
				values: VALUES,
				fieldErrors: {}
			}
		});
	});

	it('fails with 502 and the translated message for an error that is not from the API', async () => {
		const offline = testLocals();
		offline.services.devices.updateDevice.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(act('updateDevice', offline, FIELDS)).resolves.toMatchObject({
			status: 502,
			data: { message: m.devices_settings_update_rejected() }
		});

		const unknown = testLocals();
		unknown.services.devices.updateDevice.mockRejectedValue({});
		await expect(act('updateDevice', unknown, FIELDS)).resolves.toMatchObject({
			status: 502,
			data: { message: m.devices_settings_update_rejected() }
		});
	});

	it('requires a session and a DevEUI', async () => {
		const signedOut = testLocals({ jwtString: null });
		await expect(act('updateDevice', signedOut, FIELDS)).resolves.toEqual({
			status: 401,
			data: { action: 'updateDevice', message: m.devices_update_requires_login() }
		});

		const locals = testLocals();
		const invalid: Array<Record<string, string>> = [
			{ location_id: '8', dev_eui: ' ' },
			{ location_id: '8' }
		];
		for (const params of invalid) {
			await expect(act('updateDevice', locals, FIELDS, params)).resolves.toEqual({
				status: 400,
				data: { action: 'updateDevice', message: m.devices_invalid_device_id() }
			});
		}
		expect(signedOut.services.devices.updateDevice).not.toHaveBeenCalled();
		expect(locals.services.devices.updateDevice).not.toHaveBeenCalled();
	});

	it('sends a PATCH of the device as the session', async () => {
		const fake = createFakeFetch(() => jsonResponse({}));

		await act('updateDevice', realLocals(fake.fetch), FIELDS);

		const request = fake.onlyRequest();
		expect(`${request.method} ${request.path}`).toBe('PATCH /devices/DEV-1');
		expect(request.body).toEqual(VALUES);
		expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
	});

	it('maps a refusal from the real API to its status and message', async () => {
		const fake = createFakeFetch(() =>
			jsonResponse({ message: 'Not your device' }, { status: 403, statusText: 'Forbidden' })
		);

		await expect(act('updateDevice', realLocals(fake.fetch), FIELDS)).resolves.toMatchObject({
			status: 403,
			data: { action: 'updateDevice', message: 'Not your device' }
		});
	});
});

describe('updateDeviceOwnerPermission', () => {
	const FIELDS = {
		ownerKey: 'owner-key',
		targetUserEmail: ' bob@example.com ',
		permissionLevel: '3'
	};

	it("updates the owner's permission level", async () => {
		const locals = testLocals();
		locals.services.devices.updateDevicePermissionLevel.mockResolvedValue({});

		await expect(act('updateDeviceOwnerPermission', locals, FIELDS)).resolves.toEqual({
			action: 'updateDeviceOwnerPermission',
			ownerKey: 'owner-key',
			success: true,
			message: m.devices_permission_updated_for_email({ email: 'bob@example.com' })
		});
		expect(locals.services.devices.updateDevicePermissionLevel).toHaveBeenCalledWith('DEV-1', {
			targetUserEmail: 'bob@example.com',
			permissionLevel: 3
		});
	});

	it('keys the result by the email when the row sends no owner key', async () => {
		const locals = testLocals();
		locals.services.devices.updateDevicePermissionLevel.mockResolvedValue(null);

		await expect(
			act('updateDeviceOwnerPermission', locals, { ...FIELDS, ownerKey: '' })
		).resolves.toMatchObject({ ownerKey: 'bob@example.com', success: true });
	});

	it('returns the field errors for the row, without saving', async () => {
		const locals = testLocals();

		await expect(
			act('updateDeviceOwnerPermission', locals, {
				ownerKey: 'row-1',
				targetUserEmail: 'bob',
				permissionLevel: '9'
			})
		).resolves.toEqual({
			status: 400,
			data: {
				action: 'updateDeviceOwnerPermission',
				ownerKey: 'row-1',
				message: m.validation_correct_highlighted_fields(),
				values: { ownerKey: 'row-1', targetUserEmail: 'bob', permissionLevel: '9' },
				fieldErrors: {
					targetUserEmail: m.devices_owner_email_invalid(),
					permissionLevel: m.devices_choose_valid_permission_level()
				}
			}
		});
		expect(locals.services.devices.updateDevicePermissionLevel).not.toHaveBeenCalled();
	});

	it("returns the API's status and message, or 502 and the fallback", async () => {
		const refused = testLocals();
		refused.services.devices.updateDevicePermissionLevel.mockRejectedValue(
			apiError(404, 'No such owner')
		);
		await expect(act('updateDeviceOwnerPermission', refused, FIELDS)).resolves.toEqual({
			status: 404,
			data: {
				action: 'updateDeviceOwnerPermission',
				ownerKey: 'owner-key',
				message: 'No such owner',
				values: { ownerKey: 'owner-key', targetUserEmail: 'bob@example.com', permissionLevel: '3' },
				fieldErrors: {}
			}
		});

		const unknown = testLocals();
		unknown.services.devices.updateDevicePermissionLevel.mockRejectedValue({});
		await expect(act('updateDeviceOwnerPermission', unknown, FIELDS)).resolves.toMatchObject({
			status: 502,
			data: { message: m.devices_permission_update_rejected() }
		});
	});

	it('requires a session and a DevEUI', async () => {
		await expect(
			act('updateDeviceOwnerPermission', testLocals({ jwtString: null }), FIELDS)
		).resolves.toEqual({
			status: 401,
			data: {
				action: 'updateDeviceOwnerPermission',
				message: m.devices_update_owner_permission_requires_login()
			}
		});
		await expect(
			act('updateDeviceOwnerPermission', testLocals(), FIELDS, { location_id: '8' })
		).resolves.toEqual({
			status: 400,
			data: { action: 'updateDeviceOwnerPermission', message: m.devices_invalid_device_id() }
		});
	});

	it('sends a PATCH of the permission level as the session', async () => {
		const fake = createFakeFetch(() => jsonResponse({}));

		await act('updateDeviceOwnerPermission', realLocals(fake.fetch), FIELDS);

		const request = fake.onlyRequest();
		expect(`${request.method} ${request.path}`).toBe('PATCH /devices/DEV-1/permission-level');
		expect(request.body).toEqual({
			targetUserEmail: 'bob@example.com',
			permissionLevel: 3,
			dev_eui: 'DEV-1'
		});
		expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
	});
});

describe('unassignLicense', () => {
	it('unassigns the license', async () => {
		const locals = testLocals();
		locals.services.billing.unassignLicense.mockResolvedValue(license({ id: 12 }));

		await expect(act('unassignLicense', locals, { licenseId: '12' })).resolves.toEqual({
			action: 'unassignLicense',
			success: true,
			message: m.devices_license_unassigned_toast()
		});
		expect(locals.services.billing.unassignLicense).toHaveBeenCalledWith(12);
	});

	it('reads a license id typed with surrounding spaces or leading zeros', async () => {
		const locals = testLocals();
		locals.services.billing.unassignLicense.mockResolvedValue(license({ id: 12 }));

		await act('unassignLicense', locals, { licenseId: ' 12 ' });
		await act('unassignLicense', locals, { licenseId: '012' });

		expect(locals.services.billing.unassignLicense.mock.calls).toEqual([[12], [12]]);
	});

	it('rejects a missing or invalid license id, without calling the API', async () => {
		const locals = testLocals();

		// Only a whole positive number: parseInt would have accepted each of the last five.
		for (const licenseId of ['', 'abc', '0', '-3', '12abc', '12.5', '1e3', '+12', '12 13']) {
			await expect(act('unassignLicense', locals, { licenseId })).resolves.toEqual({
				status: 400,
				data: { action: 'unassignLicense', message: m.generic_error() }
			});
		}
		await expect(act('unassignLicense', locals)).resolves.toMatchObject({ status: 400 });
		expect(locals.services.billing.unassignLicense).not.toHaveBeenCalled();
	});

	it("returns the API's status and message, or 502 and the generic error", async () => {
		const refused = testLocals();
		refused.services.billing.unassignLicense.mockRejectedValue(apiError(409, 'Seat is locked'));
		await expect(act('unassignLicense', refused, { licenseId: '12' })).resolves.toEqual({
			status: 409,
			data: { action: 'unassignLicense', message: 'Seat is locked' }
		});

		const unknown = testLocals();
		unknown.services.billing.unassignLicense.mockRejectedValue({});
		await expect(act('unassignLicense', unknown, { licenseId: '12' })).resolves.toEqual({
			status: 502,
			data: { action: 'unassignLicense', message: m.generic_error() }
		});
	});

	it('requires a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(act('unassignLicense', locals, { licenseId: '12' })).resolves.toEqual({
			status: 401,
			data: { action: 'unassignLicense', message: m.devices_update_requires_login() }
		});
		expect(locals.services.billing.unassignLicense).not.toHaveBeenCalled();
	});

	it('sends a POST to unassign as the session', async () => {
		const fake = createFakeFetch(() => jsonResponse(license({ id: 12 })));

		await act('unassignLicense', realLocals(fake.fetch), { licenseId: '12' });

		const request = fake.onlyRequest();
		expect(`${request.method} ${request.path}`).toBe('POST /payments/licenses/12/unassign');
		expect(request.body).toBeUndefined();
		expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
	});
});

describe('deleteDevice', () => {
	const CONFIRMED = { confirmDevEui: ' dev-1 ', acknowledged: 'yes' };

	it('deletes the confirmed device and redirects to its location', async () => {
		const locals = testLocals();
		locals.services.devices.deleteDevice.mockResolvedValue({
			dev_eui: 'DEV-1',
			complete: true,
			purgedRows: 10
		});

		await expect(act('deleteDevice', locals, CONFIRMED)).rejects.toMatchObject({
			status: 303,
			location: '/locations/8'
		});
		expect(locals.services.devices.deleteDevice).toHaveBeenCalledWith('DEV-1');
	});

	it('encodes the trimmed location id in the redirect', async () => {
		const locals = testLocals();
		locals.services.devices.deleteDevice.mockResolvedValue({
			dev_eui: 'DEV-1',
			complete: true,
			purgedRows: 0
		});

		await expect(
			act('deleteDevice', locals, CONFIRMED, { location_id: ' North field ', dev_eui: 'DEV-1' })
		).rejects.toMatchObject({ status: 303, location: '/locations/North%20field' });
		await expect(
			act('deleteDevice', locals, CONFIRMED, { location_id: 'a/b', dev_eui: 'DEV-1' })
		).rejects.toMatchObject({ status: 303, location: '/locations/a%2Fb' });
	});

	it('redirects to the locations list when the URL names no location', async () => {
		const locals = testLocals();
		locals.services.devices.deleteDevice.mockResolvedValue({
			dev_eui: 'DEV-1',
			complete: true,
			purgedRows: 0
		});

		const urls: Array<Record<string, string>> = [
			{ dev_eui: 'DEV-1' },
			{ location_id: '  ', dev_eui: 'DEV-1' }
		];
		for (const params of urls) {
			await expect(act('deleteDevice', locals, CONFIRMED, params)).rejects.toMatchObject({
				status: 303,
				location: '/locations'
			});
		}
	});

	it('asks the page to re-submit while the API is still purging data', async () => {
		const locals = testLocals();
		locals.services.devices.deleteDevice.mockResolvedValue({
			dev_eui: 'DEV-1',
			complete: false,
			purgedRows: 5000
		});

		await expect(act('deleteDevice', locals, CONFIRMED)).resolves.toEqual({
			status: 409,
			data: {
				action: 'deleteDevice',
				inProgress: true,
				purgedRows: 5000,
				message: m.devices_delete_in_progress()
			}
		});
	});

	it('counts no purged rows when the API does not say', async () => {
		for (const result of [{ dev_eui: 'DEV-1', complete: false }, null]) {
			const locals = testLocals();
			locals.services.devices.deleteDevice.mockResolvedValue(result as never);

			await expect(act('deleteDevice', locals, CONFIRMED)).resolves.toMatchObject({
				status: 409,
				data: { inProgress: true, purgedRows: 0 }
			});
		}
	});

	it('never deletes without the typed DevEUI and the acknowledgement', async () => {
		const locals = testLocals();

		await expect(
			act('deleteDevice', locals, { confirmDevEui: 'DEV-2', acknowledged: 'yes' })
		).resolves.toEqual({
			status: 400,
			data: { action: 'deleteDevice', message: m.devices_delete_confirm_mismatch() }
		});
		await expect(act('deleteDevice', locals, { confirmDevEui: 'DEV-1' })).resolves.toEqual({
			status: 400,
			data: { action: 'deleteDevice', message: m.devices_delete_acknowledge_required() }
		});
		expect(locals.services.devices.deleteDevice).not.toHaveBeenCalled();
	});

	it("returns the API's status and message, or 502 and the fallback", async () => {
		const refused = testLocals();
		refused.services.devices.deleteDevice.mockRejectedValue(apiError(403, 'Owner only'));
		await expect(act('deleteDevice', refused, CONFIRMED)).resolves.toEqual({
			status: 403,
			data: { action: 'deleteDevice', message: 'Owner only' }
		});

		const unknown = testLocals();
		unknown.services.devices.deleteDevice.mockRejectedValue({});
		await expect(act('deleteDevice', unknown, CONFIRMED)).resolves.toEqual({
			status: 502,
			data: { action: 'deleteDevice', message: m.devices_delete_rejected() }
		});
	});

	it('requires a session and a DevEUI', async () => {
		const signedOut = testLocals({ jwtString: null });
		await expect(act('deleteDevice', signedOut, CONFIRMED)).resolves.toEqual({
			status: 401,
			data: { action: 'deleteDevice', message: m.devices_update_requires_login() }
		});

		const locals = testLocals();
		await expect(act('deleteDevice', locals, CONFIRMED, { location_id: '8' })).resolves.toEqual({
			status: 400,
			data: { action: 'deleteDevice', message: m.devices_invalid_device_id() }
		});
		expect(signedOut.services.devices.deleteDevice).not.toHaveBeenCalled();
		expect(locals.services.devices.deleteDevice).not.toHaveBeenCalled();
	});

	it('sends a DELETE of the device as the session', async () => {
		const fake = createFakeFetch(() =>
			jsonResponse({ dev_eui: 'DEV-1', complete: true, purgedRows: 0 })
		);

		await expect(act('deleteDevice', realLocals(fake.fetch), CONFIRMED)).rejects.toMatchObject({
			status: 303
		});

		const request = fake.onlyRequest();
		expect(`${request.method} ${request.path}`).toBe('DELETE /devices/DEV-1');
		expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
	});
});
