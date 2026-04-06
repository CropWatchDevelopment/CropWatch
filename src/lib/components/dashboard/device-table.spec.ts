import { describe, expect, it } from 'vitest';
import type { CwTableQuery } from '@cropwatchdevelopment/cwui';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	countDashboardDevices,
	queryDashboardDevices,
	type DashboardDeviceFilters
} from './device-table';

const devices: IDevice[] = [
	{
		dev_eui: 'dev-1',
		name: 'Alpha Canopy',
		location_name: 'Room A',
		group: 'air',
		data_table: 'cw_air_data',
		created_at: new Date('2026-03-09T00:00:00Z'),
		co2: 900,
		humidity: 51,
		temperature_c: 24,
		soil_temperature_c: null,
		soil_humidity: null,
		location_id: 1
	},
	{
		dev_eui: 'dev-2',
		name: 'Beta Canopy',
		location_name: 'Room B',
		group: 'air',
		data_table: 'cw_air_data',
		created_at: new Date('2026-03-09T01:00:00Z'),
		co2: 870,
		humidity: 54,
		temperature_c: 23,
		soil_temperature_c: null,
		soil_humidity: null,
		location_id: 2
	},
	{
		dev_eui: 'dev-3',
		name: 'Gamma Soil',
		location_name: 'Room C',
		group: 'soil',
		data_table: 'cw_soil_data',
		created_at: new Date('2026-03-09T02:00:00Z'),
		co2: 0,
		humidity: 0,
		temperature_c: 18,
		soil_temperature_c: 18,
		soil_humidity: 37,
		location_id: 3
	}
];

const locations: LocationDto[] = [
	{
		location_id: 1,
		name: 'Room A',
		created_at: '2026-03-01T00:00:00Z',
		location_group: 'North'
	} as LocationDto,
	{
		location_id: 2,
		name: 'Room B',
		created_at: '2026-03-01T00:00:00Z',
		location_group: 'North'
	} as LocationDto,
	{
		location_id: 3,
		name: 'Room C',
		created_at: '2026-03-01T00:00:00Z',
		location_group: 'South'
	} as LocationDto
];

function createQuery(overrides: Partial<CwTableQuery> = {}): CwTableQuery {
	return {
		page: 1,
		pageSize: 10,
		search: '',
		sort: null,
		filters: {},
		signal: new AbortController().signal,
		...overrides
	};
}

describe('device-table query helpers', () => {
	it('counts devices using group, location-group, and location filters', () => {
		const filters: DashboardDeviceFilters = {
			group: 'air',
			locationGroup: 'North',
			location: '2'
		};

		expect(countDashboardDevices(devices, locations, filters)).toBe(1);
	});

	it('applies search, sort, and slicing across the full filtered dataset', () => {
		const filters: DashboardDeviceFilters = {
			group: 'air',
			locationGroup: 'North',
			location: ''
		};

		const result = queryDashboardDevices(
			devices,
			locations,
			filters,
			createQuery({
				page: 1,
				pageSize: 1,
				search: 'canopy',
				sort: { column: 'created_at', direction: 'desc' }
			})
		);

		expect(result.total).toBe(2);
		expect(result.rows).toHaveLength(1);
		expect(result.rows[0]?.dev_eui).toBe('dev-2');
	});

	it('sorts optional soil columns numerically when non-soil devices have no soil readings', () => {
		const filters: DashboardDeviceFilters = {
			group: '',
			locationGroup: '',
			location: ''
		};

		const result = queryDashboardDevices(
			devices,
			locations,
			filters,
			createQuery({
				sort: { column: 'soil_humidity', direction: 'desc' }
			})
		);

		expect(result.rows.map((device) => device.dev_eui)).toEqual(['dev-3', 'dev-1', 'dev-2']);
	});
});
