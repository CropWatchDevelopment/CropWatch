import { afterEach, describe, expect, it, vi } from 'vitest';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import { testEvent, testLocals, testServerConfig, type TestLocals } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

const URL_IN = 'http://localhost/locations/8/devices/create?from=overview';

function run(locals: TestLocals, locationId = '8') {
	return load(testEvent<LoadEvent>({ locals, params: { location_id: locationId }, url: URL_IN }));
}

/** Signed-in locals whose four reads answer with the given values. */
function stubbed(
	answers: {
		deviceTypes?: unknown;
		location?: unknown;
		licenses?: unknown;
		devices?: unknown;
	} = {}
) {
	const locals = testLocals();
	const { billing, devices, locations } = locals.services;
	devices.getDeviceTypes.mockResolvedValue((answers.deviceTypes ?? []) as never);
	locations.getLocation.mockResolvedValue((answers.location ?? { name: 'Greenhouse' }) as never);
	billing.getLicenses.mockResolvedValue((answers.licenses ?? []) as never);
	devices.getDevices.mockResolvedValue((answers.devices ?? []) as never);
	return locals;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('device setup load', () => {
	it('sends a visitor without a session to the login page, and back here afterwards', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(run(locals)).rejects.toMatchObject({
			status: 303,
			location:
				'/auth/login?redirect=%2Flocations%2F8%2Fdevices%2Fcreate%3Ffrom%3Doverview&reason=auth-required'
		});
		expect(locals.services.devices.getDeviceTypes).not.toHaveBeenCalled();
		expect(locals.services.locations.getLocation).not.toHaveBeenCalled();
		expect(locals.services.billing.getLicenses).not.toHaveBeenCalled();
		expect(locals.services.devices.getDevices).not.toHaveBeenCalled();
	});

	it('gathers the models, the location, the free licenses and the groups', async () => {
		const locals = stubbed({
			deviceTypes: [
				{ id: 2, name: 'CropWatch Air' },
				{ id: '7', name: 'Soil probe' }
			],
			location: { name: 'Greenhouse', lat: 35.6812, long: '139.7671', network_region: 'eu1' },
			licenses: [
				{ id: 1, seatIndex: 0, status: 'assigned', devEui: 'A', deviceName: 'A', manual: false },
				{ id: 2, seatIndex: 1, status: 'unassigned', devEui: null, deviceName: null, manual: true }
			],
			devices: [
				{ dev_eui: 'A', location_id: 8, group: 'Floor 1' },
				{ dev_eui: 'B', location_id: 9, group: 'Elsewhere' }
			]
		});

		await expect(run(locals)).resolves.toEqual({
			locationId: '8',
			locationName: 'Greenhouse',
			locationLat: 35.6812,
			locationLong: 139.7671,
			locationRegion: 'eu1',
			deviceTypeOptions: [
				{ label: 'CropWatch Air', value: '2' },
				{ label: 'Soil probe', value: '7' }
			],
			availableLicenses: [{ id: 2, seatIndex: 1 }],
			groupSuggestions: ['Floor 1']
		});
		expect(locals.services.locations.getLocation).toHaveBeenCalledWith('8');
		expect(locals.services.devices.getDevices).toHaveBeenCalledWith({ take: 1000 });
		expect(locals.services.devices.getDeviceTypes).toHaveBeenCalledWith();
		expect(locals.services.billing.getLicenses).toHaveBeenCalledWith();
	});

	it('keeps only device types with a name and a usable id', async () => {
		const locals = stubbed({
			deviceTypes: [
				{ id: 3, name: 'Kept' },
				{ id: Number.NaN, name: 'NaN id' },
				{ id: Number.POSITIVE_INFINITY, name: 'Infinite id' },
				{ id: true, name: 'Boolean id' },
				{ name: 'No id' },
				{ id: 4, name: 42 },
				{ id: 5 },
				null,
				'Air'
			]
		});

		const data = await run(locals);

		expect(data?.deviceTypeOptions).toEqual([{ label: 'Kept', value: '3' }]);
	});

	it('offers no models when the device types are not a list', async () => {
		const data = await run(stubbed({ deviceTypes: { data: [{ id: 1, name: 'Air' }] } }));

		expect(data?.deviceTypeOptions).toEqual([]);
	});

	it('offers every licence that is not assigned', async () => {
		const data = await run(
			stubbed({
				licenses: [
					{ id: 4, seatIndex: 3, status: 'pending' },
					{ id: 5, seatIndex: 4, status: 'assigned' },
					{ id: 6, seatIndex: 5, status: 'unassigned' }
				]
			})
		);

		expect(data?.availableLicenses).toEqual([
			{ id: 4, seatIndex: 3 },
			{ id: 6, seatIndex: 5 }
		]);
	});

	it('suggests at most eight distinct, sorted groups used at this location', async () => {
		const devicesHere = [
			'Shed',
			' Barn ',
			'Barn',
			'Zone',
			'Pond',
			'Gate',
			'Field',
			'Dock',
			'Attic',
			'Cellar'
		]
			.map((group, index) => ({ dev_eui: `D${index}`, location_id: index % 2 ? '8' : 8, group }))
			.concat([
				{ dev_eui: 'E1', location_id: 8, group: '   ' },
				{ dev_eui: 'E2', location_id: 8, group: null },
				{ dev_eui: 'E3', location_id: 8 },
				{ dev_eui: 'E4', location_id: 80, group: 'Other site' },
				{ dev_eui: 'E5', location_id: null, group: 'Unplaced' }
			] as never[]);

		const data = await run(stubbed({ devices: devicesHere }));

		expect(data?.groupSuggestions).toEqual([
			'Attic',
			'Barn',
			'Cellar',
			'Dock',
			'Field',
			'Gate',
			'Pond',
			'Shed'
		]);
	});

	it('trims the location id from the URL', async () => {
		const locals = stubbed({ devices: [{ dev_eui: 'A', location_id: 8, group: 'Floor 1' }] });

		const data = await run(locals, ' 8 ');

		expect(locals.services.locations.getLocation).toHaveBeenCalledWith('8');
		expect(data).toMatchObject({ locationId: '8', groupSuggestions: ['Floor 1'] });
	});

	it('reads a missing location id as empty', async () => {
		const locals = stubbed({ devices: [{ dev_eui: 'A', location_id: null, group: 'Unplaced' }] });

		const data = await load(testEvent<LoadEvent>({ locals, params: {}, url: URL_IN }));

		expect(locals.services.locations.getLocation).toHaveBeenCalledWith('');
		expect(data).toMatchObject({ locationId: '', groupSuggestions: ['Unplaced'] });
	});

	it('ignores 0,0 placeholders, unreadable coordinates and unknown regions', async () => {
		const placeholder = await run(
			stubbed({ location: { name: 'Shed', lat: 0, long: '0', network_region: 'mars' } })
		);
		expect(placeholder).toMatchObject({
			locationLat: null,
			locationLong: null,
			locationRegion: null
		});

		const unreadable = await run(
			stubbed({ location: { name: 'Shed', lat: 'north', long: { deg: 3 }, network_region: null } })
		);
		expect(unreadable).toMatchObject({
			locationLat: null,
			locationLong: null,
			locationRegion: null
		});

		const regions = [];
		for (const region of ['as1', 'au1', 'eu1', 'nam1']) {
			const data = await run(stubbed({ location: { name: 'Shed', network_region: region } }));
			regions.push(data?.locationRegion);
		}
		expect(regions).toEqual(['as1', 'au1', 'eu1', 'nam1']);
	});

	it('degrades each read independently when the API fails', async () => {
		const locals = testLocals();
		const { billing, devices, locations } = locals.services;
		devices.getDeviceTypes.mockRejectedValue(new Error('down'));
		locations.getLocation.mockRejectedValue(new Error('down'));
		billing.getLicenses.mockRejectedValue(new Error('down'));
		devices.getDevices.mockRejectedValue(new Error('down'));

		await expect(run(locals)).resolves.toEqual({
			locationId: '8',
			locationName: '',
			locationLat: null,
			locationLong: null,
			locationRegion: null,
			deviceTypeOptions: [],
			availableLicenses: [],
			groupSuggestions: []
		});
	});

	it('still shows the rest of the page when only the licences fail (no unpaid create)', async () => {
		const locals = stubbed({ deviceTypes: [{ id: 2, name: 'Air' }] });
		locals.services.billing.getLicenses.mockRejectedValue(new Error('billing down'));

		await expect(run(locals)).resolves.toMatchObject({
			locationName: 'Greenhouse',
			deviceTypeOptions: [{ label: 'Air', value: '2' }],
			availableLicenses: []
		});
	});
});

describe('device setup load over HTTP', () => {
	it("reads everything through the request's fetch, as the session", async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const fake = createFakeFetch((request) => {
			if (request.path === '/devices/device-types') {
				return jsonResponse({ data: [{ id: 2, name: 'Air' }], total: 1 });
			}
			if (request.path === '/locations/8') {
				return jsonResponse({ location_id: 8, name: 'Greenhouse', lat: 31.9, long: 131.4 });
			}
			if (request.path === '/payments/licenses') {
				return jsonResponse([{ id: 3, seatIndex: 0, status: 'unassigned' }]);
			}
			if (request.path === '/devices?take=1000') {
				return jsonResponse([{ dev_eui: 'A', location_id: 8, group: 'Floor 1' }]);
			}
			return jsonResponse({ message: 'unexpected' }, { status: 404 });
		});
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => 'jwt-token',
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = {
			...testLocals(),
			services
		} as unknown as TestLocals;

		const data = await run(locals);

		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /devices/device-types',
			'GET /locations/8',
			'GET /payments/licenses',
			'GET /devices?take=1000'
		]);
		expect(new Set(fake.requests.map((r) => r.headers.get('authorization')))).toEqual(
			new Set(['Bearer jwt-token'])
		);
		expect(data).toEqual({
			locationId: '8',
			locationName: 'Greenhouse',
			locationLat: 31.9,
			locationLong: 131.4,
			locationRegion: null,
			deviceTypeOptions: [{ label: 'Air', value: '2' }],
			availableLicenses: [{ id: 3, seatIndex: 0 }],
			groupSuggestions: ['Floor 1']
		});
	});
});
