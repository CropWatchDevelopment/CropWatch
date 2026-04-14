import { describe, expect, it, vi } from 'vitest';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	DASHBOARD_DEVICE_OFFLINE_THRESHOLD_MS,
	DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES,
	getDashboardDeviceNextRefreshDelayMs,
	isDashboardDeviceOffline,
	refreshDashboardDevice
} from './dashboard-device-refresh';

function createDevice(overrides: Partial<IDevice> = {}): IDevice {
	return {
		dev_eui: 'dev-1',
		name: 'Canopy Sensor',
		location_name: 'Room A',
		group: 'air',
		data_table: 'cw_air_data',
		created_at: new Date('2026-04-09T10:00:00.000Z'),
		has_primary_data: true,
		co2: 820,
		humidity: 56,
		temperature_c: 24.5,
		soil_humidity: null,
		location_id: 7,
		alert_count: 1,
		device_type_id: 9,
		raw_data: {
			temperature_c: 24.5
		},
		...overrides
	};
}

describe('dashboard-device-refresh helpers', () => {
	it('refreshes a live device and merges the latest reading back into app state', async () => {
		const targetDevice = createDevice();
		const app = {
			accessToken: 'jwt-token',
			devices: [targetDevice]
		};
		const api = {
			getDeviceLatestPrimaryData: vi.fn(async () => ({
				dev_eui: 'dev-1',
				name: 'Canopy Sensor',
				location_name: 'Room A',
				group: 'air',
				created_at: '2026-04-09T10:14:00.000Z',
				co2: 901,
				humidity: 61.2,
				temperature_c: 25.7,
				location_id: 7
			}))
		};

		const latestDevice = await refreshDashboardDevice({
			app,
			devEui: targetDevice.dev_eui,
			targetDevice,
			api
		});

		expect(api.getDeviceLatestPrimaryData).toHaveBeenCalledWith('dev-1');
		expect(latestDevice).toMatchObject({
			dev_eui: 'dev-1',
			created_at: new Date('2026-04-09T10:14:00.000Z'),
			temperature_c: 25.7
		});
		expect(targetDevice).toMatchObject({
			created_at: new Date('2026-04-09T10:14:00.000Z'),
			temperature_c: 25.7,
			humidity: 61.2,
			co2: 901
		});
		expect(app.devices[0]).toMatchObject({
			dev_eui: 'dev-1',
			created_at: new Date('2026-04-09T10:14:00.000Z'),
			temperature_c: 25.7
		});
	});

	it('preserves metadata when the refresh payload omits location and type fields', async () => {
		const targetDevice = createDevice({
			location_name: 'Propagation Room',
			group: 'air',
			device_type_id: 42,
			alert_count: 2
		});
		const app = {
			accessToken: 'jwt-token',
			devices: [targetDevice]
		};
		const api = {
			getDeviceLatestPrimaryData: vi.fn(async () => ({
				dev_eui: 'dev-1',
				name: 'Canopy Sensor',
				location_name: '',
				group: '',
				created_at: '2026-04-09T10:14:00.000Z',
				co2: 777,
				humidity: 59,
				temperature_c: 23.9,
				location_id: 0
			}))
		};

		await refreshDashboardDevice({
			app,
			devEui: targetDevice.dev_eui,
			targetDevice,
			api
		});

		expect(targetDevice).toMatchObject({
			location_name: 'Propagation Room',
			group: 'air',
			location_id: 7,
			device_type_id: 42,
			alert_count: 2,
			temperature_c: 23.9
		});
		expect(app.devices[0]).toMatchObject({
			location_name: 'Propagation Room',
			group: 'air',
			location_id: 7,
			device_type_id: 42
		});
	});

	it('uses the shared 10.3-minute refresh cadence and 11-minute offline threshold', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-04-09T10:10:18.000Z'));

		const dueSoonDevice = createDevice({
			created_at: new Date('2026-04-09T10:00:01.000Z')
		});
		const nearlyOfflineDevice = createDevice({
			created_at: new Date('2026-04-09T09:59:30.000Z')
		});
		const longStaleDevice = createDevice({
			created_at: new Date('2026-04-09T08:00:00.000Z')
		});

		expect(DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES).toBe(10.3);
		expect(getDashboardDeviceNextRefreshDelayMs(dueSoonDevice)).toBe(1_000);
		expect(isDashboardDeviceOffline(nearlyOfflineDevice)).toBe(false);
		expect(isDashboardDeviceOffline(longStaleDevice)).toBe(true);
		expect(getDashboardDeviceNextRefreshDelayMs(longStaleDevice)).not.toBeNull();
		expect(DASHBOARD_DEVICE_OFFLINE_THRESHOLD_MS).toBe(11 * 60_000);

		vi.useRealTimers();
	});
});
