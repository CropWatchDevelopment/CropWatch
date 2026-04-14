import { describe, expect, it, vi, beforeEach } from 'vitest';

const apiState = vi.hoisted(() => ({
	getDeviceStatuses: vi.fn(),
	getTriggeredRulesCount: vi.fn(),
	getDeviceGroups: vi.fn(),
	getLocationGroups: vi.fn(),
	getLocations: vi.fn(),
	getLatestPrimaryDeviceData: vi.fn()
}));

vi.mock('$env/dynamic/public', () => ({
	env: {}
}));

vi.mock('$lib/api/api.service', () => ({
	ApiService: class {
		getDeviceStatuses = apiState.getDeviceStatuses;
		getTriggeredRulesCount = apiState.getTriggeredRulesCount;
		getDeviceGroups = apiState.getDeviceGroups;
		getLocationGroups = apiState.getLocationGroups;
		getLocations = apiState.getLocations;
		getLatestPrimaryDeviceData = apiState.getLatestPrimaryDeviceData;
	}
}));

import { load } from './+page.server';

type DashboardPageData = Exclude<Awaited<ReturnType<typeof load>>, void>;

beforeEach(() => {
	apiState.getDeviceStatuses.mockReset();
	apiState.getTriggeredRulesCount.mockReset();
	apiState.getDeviceGroups.mockReset();
	apiState.getLocationGroups.mockReset();
	apiState.getLocations.mockReset();
	apiState.getLatestPrimaryDeviceData.mockReset();
});

describe('dashboard page server load', () => {
	it('streams summary, filter options, and the initial table query', async () => {
		apiState.getDeviceStatuses.mockResolvedValue({ online: 8, offline: 2 });
		apiState.getTriggeredRulesCount.mockResolvedValue({ count: 3 });
		apiState.getDeviceGroups.mockResolvedValue(['air', 'soil']);
		apiState.getLocationGroups.mockResolvedValue(['North']);
		apiState.getLocations.mockResolvedValue([
			{ location_id: 2, name: 'Room B' },
			{ location_id: 1, name: 'Room A' }
		]);
		apiState.getLatestPrimaryDeviceData.mockResolvedValue({
			data: [
				{
					dev_eui: 'dev-1',
					name: 'Sensor 1',
					location_id: 1,
					location_name: 'Room A',
					group: 'air',
					created_at: '2026-04-14T10:00:00.000Z'
				}
			],
			total: 1
		});

		const result = (await load({
			locals: { jwtString: 'jwt-token' },
			fetch,
			url: new URL('https://example.com/?group=air&locationGroup=North&location=2')
		} as never)) as DashboardPageData;

		expect(result.authToken).toBe('jwt-token');
		expect(result.summary).toBeInstanceOf(Promise);
		expect(result.filterOptions).toBeInstanceOf(Promise);
		expect(result.initialTable).toBeInstanceOf(Promise);

		await expect(result.summary).resolves.toEqual({
			totalDevices: 10,
			onlineDevices: 8,
			offlineDevices: 2,
			activeAlertCount: 3,
			error: null
		});
		await expect(result.filterOptions).resolves.toEqual({
			deviceGroups: ['air', 'soil'],
			locationGroups: ['North'],
			locations: [
				{ location_id: 1, name: 'Room A' },
				{ location_id: 2, name: 'Room B' }
			],
			error: null
		});
		await expect(result.initialTable).resolves.toEqual({
			query: {
				page: 1,
				pageSize: 25,
				filters: {
					group: ['air'],
					locationGroup: ['North'],
					location: ['2']
				}
			},
			rows: [
				{
					dev_eui: 'dev-1',
					name: 'Sensor 1',
					location_id: 1,
					location_name: 'Room A',
					group: 'air',
					created_at: '2026-04-14T10:00:00.000Z'
				}
			],
			total: 1,
			error: null
		});

		expect(apiState.getLatestPrimaryDeviceData).toHaveBeenCalledWith({
			skip: 0,
			take: 25,
			group: 'air',
			locationGroup: 'North',
			location: '2'
		});
	});

	it('returns empty fallback payloads when the dashboard requests fail', async () => {
		apiState.getDeviceStatuses.mockRejectedValue(new Error('status exploded'));
		apiState.getTriggeredRulesCount.mockRejectedValue(new Error('alerts exploded'));
		apiState.getDeviceGroups.mockRejectedValue(new Error('groups exploded'));
		apiState.getLocationGroups.mockRejectedValue(new Error('location groups exploded'));
		apiState.getLocations.mockRejectedValue(new Error('locations exploded'));
		apiState.getLatestPrimaryDeviceData.mockRejectedValue(new Error('table exploded'));

		const result = (await load({
			locals: { jwtString: 'jwt-token' },
			fetch,
			url: new URL('https://example.com/')
		} as never)) as DashboardPageData;

		await expect(result.summary).resolves.toEqual({
			totalDevices: 0,
			onlineDevices: 0,
			offlineDevices: 0,
			activeAlertCount: 0,
			error: 'status exploded alerts exploded'
		});
		await expect(result.filterOptions).resolves.toEqual({
			deviceGroups: [],
			locationGroups: [],
			locations: [],
			error: 'groups exploded location groups exploded locations exploded'
		});
		await expect(result.initialTable).resolves.toEqual({
			query: {
				page: 1,
				pageSize: 25,
				filters: {}
			},
			rows: [],
			total: 0,
			error: 'table exploded'
		});
	});
});
