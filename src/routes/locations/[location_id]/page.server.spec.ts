import { describe, expect, it } from 'vitest';
import type { DevicePrimaryDataDto, LocationDto, LocationOwnerDto } from '$lib/api/api.dtos';
import { TEST_USER_ID, testEvent, testLocals, type TestLocals } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

const EMPTY = {
	allLocationDevices: [],
	currentLocation: null,
	locationInfo: null,
	hasSettings: false
};

const DEVICES = [
	{ dev_eui: 'A1', created_at: '2026-10-01T00:00:00Z', name: 'Pump' },
	{ dev_eui: 'B2', created_at: '2026-10-01T00:00:00Z', name: 'Fan' }
] as DevicePrimaryDataDto[];

const owner = (user_id: string, permission_level: unknown) =>
	({ id: 1, location_id: 8, owner_id: 1, admin_user_id: 'x', user_id, permission_level }) as never;

function location(overrides: Partial<LocationDto> = {}): LocationDto {
	return {
		location_id: 8,
		name: 'Greenhouse A',
		created_at: '2026-04-01T00:00:00Z',
		description: 'South field' as never,
		group: 'Farm' as never,
		lat: 31.9147 as never,
		long: '131.4232' as never,
		map_zoom: '15' as never,
		cw_location_owners: [owner(TEST_USER_ID, 1)],
		...overrides
	};
}

function run(locals: TestLocals, location_id = '8') {
	return load(testEvent<LoadEvent>({ locals, params: { location_id } })) as Promise<
		Record<string, unknown>
	>;
}

function signedIn(found: LocationDto | null = location(), devices = DEVICES) {
	const locals = testLocals();
	locals.services.devices.getAllLocationDevices.mockResolvedValue({ data: devices, total: 2 });
	locals.services.locations.getLocation.mockResolvedValue(found as LocationDto);
	return locals;
}

describe('location detail load', () => {
	it("loads the location's devices and the fields the overview renders", async () => {
		const locals = signedIn();

		await expect(run(locals)).resolves.toEqual({
			allLocationDevices: DEVICES,
			currentLocation: 'Greenhouse A',
			locationInfo: {
				location_id: 8,
				name: 'Greenhouse A',
				created_at: '2026-04-01T00:00:00Z',
				description: 'South field',
				group: 'Farm',
				lat: 31.9147,
				long: 131.4232,
				map_zoom: 15
			},
			hasSettings: true
		});
		expect(locals.services.devices.getAllLocationDevices).toHaveBeenCalledWith(8);
		expect(locals.services.locations.getLocation).toHaveBeenCalledWith(8);
	});

	it('keeps the owner list on the server and drops non-text or non-numeric fields', async () => {
		const data = await run(
			signedIn(
				location({
					description: { rich: true } as never,
					group: null,
					lat: 'north' as never,
					long: null,
					map_zoom: undefined
				})
			)
		);

		expect(data.locationInfo).toEqual({
			location_id: 8,
			name: 'Greenhouse A',
			created_at: '2026-04-01T00:00:00Z',
			description: null,
			group: null,
			lat: null,
			long: null,
			map_zoom: null
		});
		expect(JSON.stringify(data)).not.toContain('cw_location_owners');
	});

	it('shows the settings link to owners and managers of the location only', async () => {
		const settingsFor = async (owners: LocationOwnerDto[] | undefined) =>
			(await run(signedIn(location({ cw_location_owners: owners })))).hasSettings;

		expect(await settingsFor([owner(TEST_USER_ID, 2)])).toBe(true);
		expect(await settingsFor([owner(TEST_USER_ID, '1')])).toBe(true);
		expect(await settingsFor([owner(TEST_USER_ID, 3)])).toBe(false);
		expect(await settingsFor([owner(TEST_USER_ID, undefined)])).toBe(false);
		expect(await settingsFor([owner('someone-else', 1)])).toBe(false);
		expect(await settingsFor(undefined)).toBe(false);
		expect(await settingsFor('not-a-list' as never)).toBe(false);
	});

	it('never takes a missing or invalid permission level for a manager', async () => {
		const settingsFor = async (permission_level: unknown) =>
			(
				await run(
					signedIn(location({ cw_location_owners: [owner(TEST_USER_ID, permission_level)] }))
				)
			).hasSettings;

		// `Number(null)` and `Number('')` are 0, which would pass a "<= manager" check.
		expect(await settingsFor(null)).toBe(false);
		expect(await settingsFor('')).toBe(false);
		expect(await settingsFor(0)).toBe(false);
		expect(await settingsFor('admin')).toBe(false);
		expect(await settingsFor(1.5)).toBe(false);
		expect(await settingsFor(' 2 ')).toBe(true);
	});

	it('never shows the settings link without a user id in the session', async () => {
		const locals = signedIn();
		locals.jwt = null;

		await expect(run(locals)).resolves.toMatchObject({ hasSettings: false });
	});

	it('degrades each request independently when the API fails', async () => {
		const locals = testLocals();
		locals.services.devices.getAllLocationDevices.mockRejectedValue(new Error('down'));
		locals.services.locations.getLocation.mockRejectedValue(new Error('down'));

		await expect(run(locals)).resolves.toEqual(EMPTY);
	});

	it('treats a device page without data, or no location body, as empty', async () => {
		const locals = testLocals();
		locals.services.devices.getAllLocationDevices.mockResolvedValue({ total: 0 } as never);
		locals.services.locations.getLocation.mockResolvedValue(undefined as never);

		await expect(run(locals)).resolves.toEqual(EMPTY);
	});

	it('does not call the API without a session or with an unusable id', async () => {
		const signedOut = testLocals({ jwtString: null });
		await expect(run(signedOut)).resolves.toEqual(EMPTY);
		expect(signedOut.services.locations.getLocation).not.toHaveBeenCalled();

		const locals = testLocals();
		await expect(run(locals, 'new')).resolves.toEqual(EMPTY);
		expect(locals.services.devices.getAllLocationDevices).not.toHaveBeenCalled();
		expect(locals.services.locations.getLocation).not.toHaveBeenCalled();
	});
});
