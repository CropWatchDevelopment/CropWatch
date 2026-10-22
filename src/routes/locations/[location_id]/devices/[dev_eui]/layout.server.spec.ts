import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceDto, LocationDto, LocationOwnerDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { PermissionLevel } from '$lib/constants/permissions';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	TEST_USER_ID,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { load } from './+layout.server';

type LoadEvent = Parameters<typeof load>[0];

const DEVICE = {
	dev_eui: 'DEV-1',
	name: 'Soil probe',
	cw_device_type: { id: 1, name: 'Soil', model: 'CW-SS', data_table_v2: 'cw_soil_data' }
} as DeviceDto;

const owner = (user_id: string, permission_level: unknown) =>
	({ user_id, permission_level }) as unknown as LocationOwnerDto;

const location = (owners: LocationOwnerDto[] | undefined) =>
	({
		location_id: 8,
		name: 'North field',
		created_at: '',
		cw_location_owners: owners
	}) as LocationDto;

function run(
	locals: TestLocals,
	params: Record<string, string> = { location_id: '8', dev_eui: 'DEV-1' }
) {
	return load(testEvent<LoadEvent>({ locals, params }));
}

/** What the layout returns when there is no device to show. */
const noDevice = (authToken: string | null, devEui = 'DEV-1', locationId = '8') => ({
	authToken,
	devEui,
	locationId,
	device: null,
	dataTable: null,
	permissionLevel: PermissionLevel.DISABLED
});

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('device layout load', () => {
	it("loads the device, its data table and the caller's permission on its location", async () => {
		const locals = testLocals();
		locals.services.devices.getDevice.mockResolvedValue(DEVICE);
		locals.services.locations.getLocation.mockResolvedValue(
			location([owner('someone-else', 1), owner(TEST_USER_ID, '2')])
		);

		await expect(run(locals)).resolves.toEqual({
			authToken: TEST_JWT,
			devEui: 'DEV-1',
			locationId: '8',
			device: DEVICE,
			dataTable: 'cw_soil_data',
			permissionLevel: PermissionLevel.MANAGER
		});
		expect(locals.services.devices.getDevice).toHaveBeenCalledWith('DEV-1');
		expect(locals.services.locations.getLocation).toHaveBeenCalledWith(8);
	});

	it('gives no permission when the caller is not an owner, has no level, or is unknown', async () => {
		const cases: Array<[TestLocals, LocationOwnerDto[] | undefined]> = [
			[testLocals(), [owner('someone-else', 1)]],
			[testLocals(), [owner(TEST_USER_ID, null)]],
			[testLocals(), undefined],
			// A session token whose JWT could not be read has no user id.
			[testLocals({ jwt: null }), [owner(TEST_USER_ID, 1)]]
		];

		for (const [locals, owners] of cases) {
			locals.services.devices.getDevice.mockResolvedValue(DEVICE);
			locals.services.locations.getLocation.mockResolvedValue(location(owners));

			await expect(run(locals)).resolves.toMatchObject({
				device: DEVICE,
				permissionLevel: PermissionLevel.DISABLED
			});
		}
	});

	it('still shows the device when its location cannot be loaded', async () => {
		const locals = testLocals();
		locals.services.devices.getDevice.mockResolvedValue(DEVICE);
		locals.services.locations.getLocation.mockRejectedValue(new ApiError(403, 'Forbidden', {}));

		await expect(run(locals)).resolves.toMatchObject({
			device: DEVICE,
			dataTable: 'cw_soil_data',
			permissionLevel: PermissionLevel.DISABLED
		});
	});

	it('does not look up a location id that is not a number', async () => {
		const locals = testLocals();
		locals.services.devices.getDevice.mockResolvedValue(DEVICE);

		await expect(run(locals, { location_id: 'north', dev_eui: 'DEV-1' })).resolves.toMatchObject({
			locationId: 'north',
			device: DEVICE,
			permissionLevel: PermissionLevel.DISABLED
		});
		expect(locals.services.locations.getLocation).not.toHaveBeenCalled();
	});

	it('logs and shows no device when the device cannot be loaded', async () => {
		const locals = testLocals();
		const failure = new ApiError(404, 'Not Found', {});
		locals.services.devices.getDevice.mockRejectedValue(failure);
		locals.services.locations.getLocation.mockResolvedValue(location([]));

		await expect(run(locals)).resolves.toEqual(noDevice(TEST_JWT));
		expect(console.error).toHaveBeenCalledWith('[layout] Failed to load device DEV-1:', failure);
	});

	it('shows a device without a device type, with the generic display', async () => {
		const untyped = { dev_eui: 'DEV-1', name: 'Mystery probe' } as DeviceDto;
		const locals = testLocals();
		locals.services.devices.getDevice.mockResolvedValue(untyped);
		locals.services.locations.getLocation.mockResolvedValue(location([owner(TEST_USER_ID, 2)]));

		await expect(run(locals)).resolves.toEqual({
			authToken: TEST_JWT,
			devEui: 'DEV-1',
			locationId: '8',
			device: untyped,
			dataTable: null,
			permissionLevel: PermissionLevel.MANAGER
		});
		// A device type without a data table is treated the same way.
		locals.services.devices.getDevice.mockResolvedValue({
			...DEVICE,
			cw_device_type: { id: 9, name: 'New model' }
		} as DeviceDto);
		await expect(run(locals)).resolves.toMatchObject({
			device: { name: 'Soil probe' },
			dataTable: null
		});
		expect(console.error).not.toHaveBeenCalled();
	});

	it('loads nothing without a session or a device', async () => {
		const signedOut = testLocals({ jwtString: null });
		await expect(run(signedOut)).resolves.toEqual(noDevice(null));

		const signedIn = testLocals();
		await expect(run(signedIn, {})).resolves.toEqual(noDevice(null, '', ''));

		expect(signedOut.services.devices.getDevice).not.toHaveBeenCalled();
		expect(signedIn.services.devices.getDevice).not.toHaveBeenCalled();
	});

	it('sends both requests as the session through the request-scoped services', async () => {
		const fake = createFakeFetch(({ path }) =>
			path === '/devices/DEV-1'
				? jsonResponse(DEVICE)
				: jsonResponse(location([owner(TEST_USER_ID, 1)]))
		);
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as TestLocals;

		await expect(run(locals)).resolves.toMatchObject({
			permissionLevel: PermissionLevel.ADMIN
		});
		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /devices/DEV-1',
			'GET /locations/8'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});
