import { describe, expect, it } from 'vitest';
import type { DeviceDto, DevicePrimaryDataDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	applyDashboardLatestReadings,
	mapDashboardDeviceMetadataToDevice,
	mapDashboardPrimaryDataToDevice,
	mergeDashboardDevices
} from './dashboard-device-data';

describe('dashboard-device-data helpers', () => {
	it('maps device metadata into offline dashboard device rows', () => {
		const payload: DeviceDto = {
			dev_eui: 'dev-9',
			name: 'Unreported Sensor',
			group: 'air',
			location_id: 17,
			cw_device_type: { data_table_v2: 'cw_air_data' } as DeviceDto['cw_device_type'],
			cw_locations: [{ name: 'North Loft' }]
		};

		expect(mapDashboardDeviceMetadataToDevice(payload)).toEqual({
			dev_eui: 'dev-9',
			name: 'Unreported Sensor',
			location_name: 'North Loft',
			group: 'air',
			data_table: 'cw_air_data',
			created_at: new Date(0),
			has_primary_data: false,
			co2: 0,
			humidity: 0,
			temperature_c: 0,
			soil_temperature_c: null,
			soil_humidity: null,
			location_id: 17,
			cwloading: false,
			device_type_id: undefined
		});
	});

	it('reads embedded location metadata when cw_locations is a single object', () => {
		const payload = {
			dev_eui: 'dev-10',
			name: 'Lobby Sensor',
			group: 'air',
			cw_locations: {
				location_id: 88,
				name: 'Toyotama Floor 2'
			},
			cw_device_type: { data_table_v2: 'cw_air_data' } as DeviceDto['cw_device_type']
		} satisfies Omit<DeviceDto, 'location_id'>;

		expect(mapDashboardDeviceMetadataToDevice(payload)).toMatchObject({
			dev_eui: 'dev-10',
			data_table: 'cw_air_data',
			location_id: 88,
			location_name: 'Toyotama Floor 2',
			has_primary_data: false
		});
	});

	it('maps latest primary API payloads into dashboard device rows', () => {
		const payload: DevicePrimaryDataDto = {
			dev_eui: 'dev-1',
			name: 'Canopy 1',
			location_name: 'Zone A',
			group: 'air',
			created_at: '2026-03-13T00:00:00.000Z',
			co2: 914,
			humidity: 63.2,
			temperature_c: 24.8,
			location_id: 42
		};

		expect(mapDashboardPrimaryDataToDevice(payload)).toEqual({
			dev_eui: 'dev-1',
			name: 'Canopy 1',
			location_name: 'Zone A',
			group: 'air',
			created_at: new Date('2026-03-13T00:00:00.000Z'),
			has_primary_data: true,
			co2: 914,
			humidity: 63.2,
			temperature_c: 24.8,
			soil_temperature_c: null,
			soil_humidity: null,
			location_id: 42,
			cwloading: false,
			device_type_id: undefined,
			raw_data: {
				dev_eui: 'dev-1',
				name: 'Canopy 1',
				location_name: 'Zone A',
				group: 'air',
				created_at: '2026-03-13T00:00:00.000Z',
				co2: 914,
				humidity: 63.2,
				temperature_c: 24.8,
				location_id: 42
			}
		});
	});

	it('maps soil primary API payloads into soil-specific dashboard columns', () => {
		const payload = {
			dev_eui: 'soil-1',
			name: 'Soil Bed 1',
			location_name: 'Zone S',
			group: 'soil',
			data_table: 'cw_soil_data',
			created_at: '2026-03-13T00:00:00.000Z',
			temperature_c: 18.6,
			moisture: 34.5,
			location_id: 77
		} satisfies DevicePrimaryDataDto;

		expect(mapDashboardPrimaryDataToDevice(payload)).toMatchObject({
			dev_eui: 'soil-1',
			data_table: 'cw_soil_data',
			temperature_c: 18.6,
			soil_temperature_c: 18.6,
			soil_humidity: 34.5,
			location_id: 77
		});
	});

	it('applies and merges the latest readings while preserving device order', () => {
		const currentDevices: IDevice[] = [
			{
				dev_eui: 'dev-1',
				name: 'Canopy 1',
				location_name: 'Zone A',
				group: 'air',
				data_table: 'cw_air_data',
				created_at: new Date('2026-03-13T00:00:00.000Z'),
				has_primary_data: true,
				co2: 914,
				humidity: 63.2,
				temperature_c: 24.8,
				soil_temperature_c: null,
				soil_humidity: null,
				location_id: 42,
				cwloading: true
			},
			{
				dev_eui: 'dev-2',
				name: 'Canopy 2',
				location_name: 'Zone B',
				group: 'air',
				data_table: 'cw_air_data',
				created_at: new Date('2026-03-13T00:05:00.000Z'),
				has_primary_data: true,
				co2: 880,
				humidity: 59.1,
				temperature_c: 23.4,
				soil_temperature_c: null,
				soil_humidity: null,
				location_id: 99
			}
		];
		const latestDev1 = mapDashboardPrimaryDataToDevice({
			dev_eui: 'dev-1',
			name: 'Canopy 1',
			location_name: 'Zone A',
			group: 'air',
			created_at: '2026-03-13T00:10:00.000Z',
			co2: 920,
			humidity: 61.7,
			temperature_c: 25.1,
			location_id: 42
		});
		const latestDev3 = mapDashboardPrimaryDataToDevice({
			dev_eui: 'dev-3',
			name: 'Canopy 3',
			location_name: 'Zone C',
			group: 'air',
			created_at: '2026-03-13T00:15:00.000Z',
			co2: 901,
			humidity: 58.4,
			temperature_c: 22.9,
			location_id: 100
		});
		const metadataOnlyDev4 = mapDashboardDeviceMetadataToDevice({
			dev_eui: 'dev-4',
			name: 'Offline Device',
			group: 'air',
			location_id: 200,
			location_name: 'Zone D',
			cw_device_type: { data_table_v2: 'cw_air_data' } as DeviceDto['cw_device_type']
		});

		const appliedTarget = structuredClone(currentDevices[0]);
		applyDashboardLatestReadings(appliedTarget, latestDev1);
		expect(appliedTarget).toMatchObject({
			created_at: new Date('2026-03-13T00:10:00.000Z'),
			has_primary_data: true,
			data_table: 'cw_air_data',
			co2: 920,
			humidity: 61.7,
			temperature_c: 25.1,
			soil_temperature_c: null,
			soil_humidity: null
		});

		const mergedDevices = mergeDashboardDevices(currentDevices, [
			metadataOnlyDev4,
			latestDev3,
			latestDev1
		]);
		expect(mergedDevices.map((device) => device.dev_eui)).toEqual([
			'dev-1',
			'dev-2',
			'dev-4',
			'dev-3'
		]);
		expect(mergedDevices[0]).toMatchObject({
			dev_eui: 'dev-1',
			created_at: new Date('2026-03-13T00:10:00.000Z'),
			has_primary_data: true,
			cwloading: true
		});
		expect(mergedDevices[2]).toMatchObject({
			dev_eui: 'dev-4',
			location_name: 'Zone D',
			created_at: new Date(0),
			has_primary_data: false,
			cwloading: false
		});
		expect(mergedDevices[3]).toMatchObject({
			dev_eui: 'dev-3',
			location_name: 'Zone C',
			has_primary_data: true,
			cwloading: false
		});
	});

	it('preserves metadata when latest primary data omits location fields', () => {
		const currentDevices: IDevice[] = [
			{
				dev_eui: 'dev-11',
				name: 'Hallway Sensor',
				location_name: 'とよたま２階',
				group: 'air',
				data_table: 'cw_air_data',
				created_at: new Date(0),
				has_primary_data: false,
				co2: 0,
				humidity: 0,
				temperature_c: 0,
				soil_temperature_c: null,
				soil_humidity: null,
				location_id: 501,
				cwloading: false
			}
		];

		const mergedDevices = mergeDashboardDevices(currentDevices, [
			mapDashboardPrimaryDataToDevice({
				dev_eui: 'dev-11',
				name: '',
				location_name: '',
				group: '',
				created_at: '2026-03-13T00:20:00.000Z',
				co2: 777,
				humidity: 48.5,
				temperature_c: 21.3,
				location_id: 0
			})
		]);

		expect(mergedDevices).toHaveLength(1);
		expect(mergedDevices[0]).toMatchObject({
			dev_eui: 'dev-11',
			name: 'Hallway Sensor',
			location_name: 'とよたま２階',
			group: 'air',
			location_id: 501,
			co2: 777,
			humidity: 48.5,
			temperature_c: 21.3,
			has_primary_data: true
		});
	});

	it('preserves soil classification when a refresh payload omits explicit soil fields', () => {
		const currentDevices: IDevice[] = [
			{
				dev_eui: 'soil-2',
				name: 'Soil Plot 2',
				location_name: 'Bed B',
				group: 'soil',
				data_table: 'cw_soil_data',
				created_at: new Date('2026-03-13T00:00:00.000Z'),
				has_primary_data: true,
				co2: 0,
				humidity: 0,
				temperature_c: 18.1,
				soil_temperature_c: 18.1,
				soil_humidity: 31.4,
				location_id: 612,
				cwloading: false
			}
		];

		const mergedDevices = mergeDashboardDevices(currentDevices, [
			mapDashboardPrimaryDataToDevice({
				dev_eui: 'soil-2',
				name: 'Soil Plot 2',
				location_name: 'Bed B',
				group: 'soil',
				created_at: '2026-03-13T00:30:00.000Z',
				temperature_c: 19.2,
				location_id: 612
			})
		]);

		expect(mergedDevices[0]).toMatchObject({
			dev_eui: 'soil-2',
			data_table: 'cw_soil_data',
			temperature_c: 19.2,
			soil_temperature_c: 19.2,
			soil_humidity: 31.4
		});
	});
});
