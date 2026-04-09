import { describe, expect, it, vi } from 'vitest';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import { buildDashboardLocationSensorCards } from './device-cards';
import {
	DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES,
	getDashboardDeviceNextRefreshDelayMs
} from './dashboard-device-refresh';

describe('device-cards helpers', () => {
	it('groups devices by location, sorts titles, and disambiguates duplicate labels', () => {
		const devices: IDevice[] = [
			{
				dev_eui: 'dev-2',
				name: 'Canopy',
				location_name: 'Zone B',
				group: 'air',
				created_at: new Date('2026-03-13T00:00:00.000Z'),
				co2: 880,
				humidity: 54,
				temperature_c: 22,
				location_id: 2
			},
			{
				dev_eui: 'dev-1',
				name: 'Canopy',
				location_name: 'Zone B',
				group: 'air',
				created_at: new Date('2026-03-13T00:01:00.000Z'),
				co2: 901,
				humidity: 58,
				temperature_c: 23,
				location_id: 2
			},
			{
				dev_eui: 'dev-3',
				name: 'Atrium Sensor',
				location_name: 'Atrium',
				group: 'air',
				created_at: new Date('2026-03-13T00:02:00.000Z'),
				co2: 915,
				humidity: 62,
				temperature_c: 25,
				location_id: 1
			}
		];
		const locations: LocationDto[] = [
			{
				location_id: 2,
				name: 'Zone B',
				created_at: '2026-03-01T00:00:00.000Z'
			} as LocationDto,
			{
				location_id: 1,
				name: 'Atrium',
				created_at: '2026-03-01T00:00:00.000Z'
			} as LocationDto
		];

		const cards = buildDashboardLocationSensorCards(devices, locations);

		expect(cards.map((card) => card.title)).toEqual(['Atrium', 'Zone B']);
		expect(cards[1]?.devices.map((device) => device.label)).toEqual([
			'Canopy (dev-1)',
			'Canopy (dev-2)'
		]);
		expect(cards[1]?.deviceBindingsByLabel['Canopy (dev-1)']).toEqual({
			devEui: 'dev-1',
			locationId: 2,
			sourceDevice: devices[1]
		});
	});

	it('uses the shared 11-minute offline threshold and keeps refresh cadence beyond one hour', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-03-13T12:00:00.000Z'));

		const cards = buildDashboardLocationSensorCards(
			[
				{
					dev_eui: 'dev-1',
					name: 'Recent Sensor',
					location_name: 'Zone A',
					group: 'air',
					created_at: new Date('2026-03-13T11:56:00.000Z'),
					co2: 900,
					humidity: 58,
					temperature_c: 23,
					location_id: 1
				},
				{
					dev_eui: 'dev-2',
					name: 'Old Sensor',
					location_name: 'Zone A',
					group: 'air',
					created_at: new Date('2026-03-13T10:30:00.000Z'),
					co2: 860,
					humidity: 52,
					temperature_c: 20,
					location_id: 1
				}
			],
			[
				{
					location_id: 1,
					name: 'Zone A',
					created_at: '2026-03-01T00:00:00.000Z'
				} as LocationDto
			]
		);

		expect(cards[0]?.devices[0]).toMatchObject({
			label: 'Old Sensor',
			status: 'offline'
		});
		expect(cards[0]?.devices[1]).toMatchObject({
			label: 'Recent Sensor',
			status: 'online'
		});
		expect(cards[0]?.devices[1]?.expectedUpdateAfterMinutes).toBeUndefined();
		expect(
			getDashboardDeviceNextRefreshDelayMs(cards[0]!.deviceBindingsByLabel['Old Sensor'].sourceDevice)
		).not.toBeNull();
		expect(DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES).toBe(10.3);

		vi.useRealTimers();
	});

	it('keeps metadata-only devices offline without arming an overdue timer', () => {
		const cards = buildDashboardLocationSensorCards(
			[
				{
					dev_eui: 'dev-5',
					name: 'No Data Yet',
					location_name: 'Zone X',
					group: 'air',
					created_at: new Date(0),
					has_primary_data: false,
					co2: 0,
					humidity: 0,
					temperature_c: 0,
					location_id: 5
				}
			],
			[
				{
					location_id: 5,
					name: 'Zone X',
					created_at: '2026-03-01T00:00:00.000Z'
				} as LocationDto
			]
		);

		expect(cards[0]?.devices[0]).toMatchObject({
			label: 'No Data Yet',
			status: 'offline',
			detailRows: [
				expect.objectContaining({ label: 'Temperature', value: 'No reading' }),
				expect.objectContaining({ label: 'Humidity', value: 'No reading' }),
				expect.objectContaining({ label: 'Last Update', value: 'No primary data yet' })
			]
		});
	});
});
