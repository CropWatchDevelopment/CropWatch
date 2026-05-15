import { describe, expect, it, vi } from 'vitest';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import { m } from '$lib/paraglide/messages.js';
import { buildDashboardLocationSensorCards, buildRelayExpandedDetailRows } from './device-cards';
import {
	DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES,
	getDashboardDeviceNextRefreshDelayMs
} from './dashboard-device-refresh';

describe('device-cards helpers', () => {
	it('groups devices by location and keeps simple device labels', () => {
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

		const cards = buildDashboardLocationSensorCards(devices, locations, Date.now());

		expect(cards.map((card) => card.title)).toEqual(['Zone B', 'Atrium']);
		expect(cards[0]?.sensors.map(({ sensor }) => sensor.label)).toEqual(['Canopy', 'Canopy']);
		expect(cards[0]?.sensors[0]).toMatchObject({
			id: 'sensor:dev-2',
			storageKey: 'dashboard-device-card:dev-2',
			devEui: 'dev-2',
			locationId: 2,
			sourceDevice: devices[0]
		});
	});

	it('deduplicates repeated device rows so sensor keys stay unique', () => {
		const devices: IDevice[] = [
			{
				dev_eui: 'dev-1',
				name: 'Canopy',
				location_name: 'Zone A',
				group: 'air',
				created_at: new Date('2026-03-13T00:00:00.000Z'),
				co2: 880,
				humidity: 54,
				temperature_c: 21,
				location_id: 1
			},
			{
				dev_eui: 'dev-1',
				name: 'Canopy',
				location_name: 'Zone A',
				group: 'air',
				created_at: new Date('2026-03-13T00:10:00.000Z'),
				co2: 901,
				humidity: 58,
				temperature_c: 23,
				location_id: 1
			}
		];

		const cards = buildDashboardLocationSensorCards(
			devices,
			[{ location_id: 1, name: 'Zone A' } as LocationDto],
			Date.now()
		);

		expect(cards[0]?.sensors).toHaveLength(1);
		expect(cards[0]?.sensors[0]).toMatchObject({
			id: 'sensor:dev-1',
			devEui: 'dev-1',
			sensor: {
				label: 'Canopy',
				primaryValue: 23
			}
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
			],
			Date.now()
		);

		expect(cards[0]?.sensors[0]?.sensor).toMatchObject({
			label: 'Recent Sensor',
			status: 'online'
		});
		expect(cards[0]?.sensors[0]?.sensor.expectedUpdateAfterMinutes).toBeUndefined();
		expect(cards[0]?.sensors[1]?.sensor).toMatchObject({
			label: 'Old Sensor',
			status: 'offline'
		});
		expect(getDashboardDeviceNextRefreshDelayMs(cards[0]!.sensors[1]!.sourceDevice)).not.toBeNull();
		expect(DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES).toBe(10.3);

		vi.useRealTimers();
	});

	it('renders ON/OFF labels on the primary fields for relay devices', () => {
		const recentNow = new Date('2026-04-30T12:00:00.000Z').getTime();
		const recentCreatedAt = new Date('2026-04-30T11:59:30.000Z');

		const cards = buildDashboardLocationSensorCards(
			[
				{
					dev_eui: 'relay-mixed',
					name: 'Greenhouse Relay',
					location_name: 'North Bay',
					group: 'relay',
					data_table: 'cw_relay_data',
					created_at: recentCreatedAt,
					has_primary_data: true,
					co2: 0,
					humidity: 0,
					temperature_c: 0,
					soil_humidity: null,
					location_id: 7,
					raw_data: { relay_1: true, relay_2: false }
				},
				{
					dev_eui: 'relay-numeric',
					name: 'Pump Relay',
					location_name: 'North Bay',
					group: 'relay',
					data_table: 'cw_relay_data',
					created_at: recentCreatedAt,
					has_primary_data: true,
					co2: 0,
					humidity: 0,
					temperature_c: 0,
					soil_humidity: null,
					location_id: 7,
					raw_data: { relay_1: 1, relay_2: 0 }
				},
				{
					dev_eui: 'relay-blank',
					name: 'Idle Relay',
					location_name: 'North Bay',
					group: 'relay',
					data_table: 'cw_relay_data',
					created_at: recentCreatedAt,
					has_primary_data: true,
					co2: 0,
					humidity: 0,
					temperature_c: 0,
					soil_humidity: null,
					location_id: 7
				}
			],
			[{ location_id: 7, name: 'North Bay' } as LocationDto],
			recentNow
		);

		const sensors = cards[0]!.sensors.map((entry) => entry.sensor);
		const greenhouse = sensors.find((sensor) => sensor.label === 'Greenhouse Relay');
		const pump = sensors.find((sensor) => sensor.label === 'Pump Relay');
		const idle = sensors.find((sensor) => sensor.label === 'Idle Relay');

		expect(greenhouse).toMatchObject({
			label: 'Greenhouse Relay',
			primaryValue: 1,
			primaryLabel: m.display_relay_state_on(),
			primary_icon: 'relay',
			secondaryValue: 0,
			secondaryLabel: m.display_relay_state_off(),
			secondary_icon: 'relay',
			status: 'online'
		});
		expect(greenhouse?.primaryUnit).toBe(m.display_relay_one());
		expect(greenhouse?.secondaryUnit).toBe(m.display_relay_two());

		expect(pump).toMatchObject({
			primaryValue: 1,
			primaryLabel: m.display_relay_state_on(),
			secondaryValue: 0,
			secondaryLabel: m.display_relay_state_off()
		});

		expect(idle).toMatchObject({
			primaryValue: 0,
			primaryLabel: m.display_relay_state_unknown(),
			secondaryValue: 0,
			secondaryLabel: m.display_relay_state_unknown()
		});
	});

	it('builds expanded relay detail rows with the last-update timestamp', () => {
		const createdAt = new Date('2026-04-30T11:59:30.000Z');
		const rows = buildRelayExpandedDetailRows(
			{ relay_1: true, relay_2: false, created_at: createdAt },
			'Greenhouse Relay'
		);

		expect(rows).toHaveLength(3);
		expect(rows[0]).toMatchObject({
			id: 'Greenhouse Relay-relay_1',
			value: m.display_relay_state_on(),
			icon: 'relay'
		});
		expect(rows[1]).toMatchObject({
			id: 'Greenhouse Relay-relay_2',
			value: m.display_relay_state_off(),
			icon: 'relay'
		});
		expect(rows[2]).toMatchObject({
			id: 'Greenhouse Relay-updated',
			icon: 'timer'
		});
	});

	it('omits the last-update row when created_at is missing or invalid', () => {
		expect(buildRelayExpandedDetailRows({ relay_1: true, relay_2: true }, 'X')).toHaveLength(2);
		expect(
			buildRelayExpandedDetailRows({ relay_1: true, relay_2: true, created_at: 'nope' }, 'X')
		).toHaveLength(2);
	});

	it('renders unknown labels in expanded rows when relay values are absent', () => {
		const rows = buildRelayExpandedDetailRows({}, 'X');
		expect(rows[0].value).toBe(m.display_relay_state_unknown());
		expect(rows[1].value).toBe(m.display_relay_state_unknown());
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
			],
			Date.now()
		);

		expect(cards[0]?.sensors[0]?.sensor).toMatchObject({
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
