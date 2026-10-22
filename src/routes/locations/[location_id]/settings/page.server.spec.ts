import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type { DevicePrimaryDataDto, LocationDto } from '$lib/api/api.dtos';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { m } from '$lib/paraglide/messages.js';
import { TEST_USER_ID, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { actions, load } from './+page.server';
import * as settingsActions from './location-settings-actions.server';

type LoadEvent = Parameters<typeof load>[0];
type LoadData = Exclude<Awaited<ReturnType<typeof load>>, void>;

const run = async (locals: TestLocals, location_id = '8') =>
	(await load(testEvent<LoadEvent>({ locals, params: { location_id } }))) as LoadData;

function location(overrides: Partial<LocationDto> = {}): LocationDto {
	return {
		location_id: 8,
		name: 'Greenhouse A',
		group: 'Farm' as never,
		created_at: '2026-04-01T00:00:00Z',
		owner_id: TEST_USER_ID as never,
		lat: '31.9147' as never,
		long: 131.4232 as never,
		map_zoom: 15 as never,
		cw_location_owners: [],
		...overrides
	};
}

function owner(
	found: LocationDto = location(),
	devices: Partial<DevicePrimaryDataDto>[] = [],
	locals = testLocals()
) {
	locals.services.locations.getLocation.mockResolvedValue(found);
	locals.services.locations.getLocationDeletePreflight.mockResolvedValue({
		location_id: 8,
		device_count: 0
	});
	locals.services.devices.getAllLocationDevices.mockResolvedValue({
		data: devices as DevicePrimaryDataDto[],
		total: devices.length
	});
	return locals;
}

async function denial(promise: Promise<unknown>) {
	try {
		await promise;
		return null;
	} catch (err) {
		if (isHttpError(err)) return { status: err.status, message: err.body.message };
		throw err;
	}
}

describe('location settings load (mock services)', () => {
	it('maps the location, its coordinates and the device positions', async () => {
		const locals = owner(location(), [
			{ dev_eui: 'A', lat: '31.91', long: 131.42 },
			{ dev_eui: 'B', lat: null, long: 'x' }
		]);

		await expect(run(locals)).resolves.toEqual({
			locationId: 8,
			locationName: 'Greenhouse A',
			locationGroup: 'Farm',
			coordinates: { lat: 31.9147, long: 131.4232 },
			mapZoom: 15,
			devicePositions: [
				{ lat: 31.91, long: 131.42 },
				{ lat: null, long: null }
			],
			locationOwners: [],
			deletion: { deviceCount: 0 }
		});
		expect(locals.services.locations.getLocation).toHaveBeenCalledWith(8);
		expect(locals.services.locations.getLocationDeletePreflight).toHaveBeenCalledWith(8);
		expect(locals.services.devices.getAllLocationDevices).toHaveBeenCalledWith(8);
	});

	it('falls back for a missing name, group, owner list and device page', async () => {
		const locals = owner(
			location({ name: undefined as never, group: undefined, cw_location_owners: undefined })
		);
		locals.services.devices.getAllLocationDevices.mockResolvedValue({ total: 0 } as never);

		const data = await run(locals);

		expect(data.locationName).toBe('Location 8');
		expect(data.locationGroup).toBe('');
		expect(data.locationOwners).toEqual([]);
		expect(data.devicePositions).toEqual([]);
	});

	it('has no coordinates for 0,0, a missing half, or a zoom that is not a number', async () => {
		const zeroes = await run(owner(location({ lat: 0 as never, long: '0' as never })));
		expect(zeroes.coordinates).toBeNull();

		const half = await run(owner(location({ long: null, map_zoom: 'far' as never })));
		expect(half.coordinates).toBeNull();
		expect(half.mapZoom).toBeNull();
	});

	it('still opens when the preflight and the device list fail (not the owner, API down)', async () => {
		const locals = owner(location({ owner_id: null }));
		locals.jwt = { sub: TEST_USER_ID, email: 'ops@cropwatch.io' } as IJWT;
		locals.services.locations.getLocationDeletePreflight.mockRejectedValue(new Error('403'));
		locals.services.devices.getAllLocationDevices.mockRejectedValue(new Error('down'));

		await expect(run(locals)).resolves.toMatchObject({ deletion: null, devicePositions: [] });
	});

	it('accepts an owner id or an Admin grant given as numbers or strings', async () => {
		const numericOwner = testLocals({ jwt: { sub: '42', email: 'a@b.c' } as IJWT });
		owner(location({ owner_id: 42 as never }), [], numericOwner);
		await expect(run(numericOwner)).resolves.toMatchObject({ locationId: 8 });

		const admin = testLocals({ jwt: { sub: 'admin-user', email: 'a@b.c' } as IJWT });
		owner(
			location({
				owner_id: 'someone-else' as never,
				cw_location_owners: [
					{ user_id: ' admin-user ', permission_level: '1' } as never,
					{ user_id: 'admin-user', permission_level: 2 } as never
				]
			}),
			[],
			admin
		);
		await expect(run(admin)).resolves.toMatchObject({ locationId: 8 });
	});

	it('denies a session without a user id unless it is staff', async () => {
		const locals = owner(location({ owner_id: '' as never }));
		locals.jwt = { email: 'user@example.com' } as IJWT;

		await expect(denial(run(locals))).resolves.toEqual({
			status: 403,
			message: m.locations_permission_denied()
		});
	});

	it('returns empty settings without a session, or with an unusable id', async () => {
		const empty = {
			locationName: '',
			locationGroup: '',
			coordinates: null,
			mapZoom: null,
			devicePositions: [],
			locationOwners: [],
			deletion: null
		};

		const signedOut = testLocals({ jwtString: null });
		await expect(run(signedOut)).resolves.toEqual({ locationId: 8, ...empty });
		expect(signedOut.services.locations.getLocation).not.toHaveBeenCalled();

		const locals = testLocals();
		await expect(run(locals, 'abc')).resolves.toEqual({ locationId: null, ...empty });
		await expect(load(testEvent<LoadEvent>({ locals, params: {} }))).resolves.toEqual({
			locationId: null,
			...empty
		});
		expect(locals.services.locations.getLocation).not.toHaveBeenCalled();
	});
});

describe('location settings actions', () => {
	it('exposes every settings form action', () => {
		expect(actions).toEqual({
			updateLocationName: settingsActions.updateLocationName,
			updateLocationCoordinates: settingsActions.updateLocationCoordinates,
			addPermission: settingsActions.addPermission,
			editPermission: settingsActions.editPermission,
			updateUserPermissionLevel: settingsActions.updateUserPermissionLevel,
			removePermission: settingsActions.removePermission,
			deleteLocation: settingsActions.deleteLocation
		});
	});
});
