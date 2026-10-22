import { describe, expect, it } from 'vitest';
import { metricColor } from '@cropwatchdevelopment/cwui';
import type { PreferencesDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { relayStateLabel } from '$lib/devices/relay-labels';
import { m } from '$lib/paraglide/messages.js';
import { labelFor } from '$lib/sensor-labels';
import { convertSensorValue, resolveDisplayUnit } from '$lib/units';
import { computeDewPoint } from '$lib/utils/dewPoint';
import {
	DEFAULT_RANGE_SELECTION,
	DEW_POINT_SERIES_ID,
	buildDewPointChartSeries,
	buildSensorChartSeries,
	createEmptyRelaySnapshot,
	createRouteState,
	getRangeBounds,
	getRangeOptions,
	getRelayTargetStateLabel,
	getVerifiedRelayStateLabel,
	isTelemetryRow,
	mapRelayApiErrorMessage,
	normalizeTelemetryRows,
	readCreatedAt,
	readLocationName,
	readRelayTelemetryRow,
	toIsoString
} from './device-detail';

const T1 = '2026-10-21T10:00:00.000Z';
const T2 = '2026-10-21T10:10:00.000Z';
const HOUR = 60 * 60 * 1000;
const FAHRENHEIT = { temperature_unit: 'fahrenheit' } as PreferencesDto;

const apiError = (status: number) => new ApiError(status, 'Error', { url: '', payload: null });

describe('telemetry rows', () => {
	it('recognises a row as a plain object', () => {
		expect(isTelemetryRow({ id: 1 })).toBe(true);
		expect(isTelemetryRow([])).toBe(false);
		expect(isTelemetryRow(null)).toBe(false);
		expect(isTelemetryRow('row')).toBe(false);
	});

	it('reads rows from a list or a paginated response, dropping anything else', () => {
		expect(normalizeTelemetryRows([{ id: 1 }, null, 'x', { id: 2 }])).toEqual([
			{ id: 1 },
			{ id: 2 }
		]);
		expect(normalizeTelemetryRows({ data: [{ id: 3 }, 4], total: 2 })).toEqual([{ id: 3 }]);
		expect(normalizeTelemetryRows({ data: 'nope' })).toEqual([]);
		expect(normalizeTelemetryRows(null)).toEqual([]);
	});

	it('reads the creation time of a row', () => {
		expect(readCreatedAt({ created_at: T1 })).toBe(T1);
		expect(readCreatedAt({ created_at: 1 })).toBeNull();
		expect(readCreatedAt(null)).toBeNull();
		expect(readCreatedAt(undefined)).toBeNull();
	});

	it('converts a date or a timestamp to ISO', () => {
		expect(toIsoString(new Date(T1))).toBe(T1);
		expect(toIsoString('2026-10-21T19:00:00+09:00')).toBe(T1);
	});
});

describe('readLocationName', () => {
	it("prefers the joined location's name, then the device's location name", () => {
		expect(readLocationName({ cw_locations: { name: 'North field' }, location_name: 'x' })).toBe(
			'North field'
		);
		expect(readLocationName({ cw_locations: { name: '  ' }, location_name: 'Barn' })).toBe('Barn');
		expect(readLocationName({ cw_locations: [{ name: 'Array' }], location_name: 'Barn' })).toBe(
			'Barn'
		);
	});

	it('falls back to "unknown location"', () => {
		expect(readLocationName({ location_name: ' ' })).toBe(m.devices_unknown_location());
		expect(readLocationName({ cw_locations: { name: 7 } })).toBe(m.devices_unknown_location());
		expect(readLocationName(null)).toBe(m.devices_unknown_location());
	});
});

describe('readRelayTelemetryRow', () => {
	it('reads the relay row itself, a nested row, or the first row of a list', () => {
		expect(readRelayTelemetryRow({ id: 'a', created_at: T1, relay_1: 1, relay_2: 0 })).toEqual({
			id: 'a',
			created_at: T1,
			relay_1: true,
			relay_2: false
		});
		expect(readRelayTelemetryRow({ data: { id: 'b', last_update: T2, relay_1: true } })).toEqual({
			id: 'b',
			last_update: T2,
			created_at: T2,
			relay_1: true,
			relay_2: null
		});
		expect(readRelayTelemetryRow({ data: [{ id: 'c' }] })).toEqual({ id: 'c' });
		expect(readRelayTelemetryRow([{ id: 'd' }])).toEqual({ id: 'd' });
	});

	it('returns null when there is no row', () => {
		expect(readRelayTelemetryRow({ data: [] })).toBeNull();
		expect(readRelayTelemetryRow(null)).toBeNull();
	});
});

describe('ranges and route state', () => {
	it('offers today and the last 24, 48 and 72 hours', () => {
		expect(getRangeOptions()).toEqual([
			{ label: m.devices_range_today_only(), value: DEFAULT_RANGE_SELECTION },
			{ label: m.devices_range_last_hours({ hours: '24' }), value: 24 },
			{ label: m.devices_range_last_hours({ hours: '48' }), value: 48 },
			{ label: m.devices_range_last_hours({ hours: '72' }), value: 72 }
		]);
		expect(DEFAULT_RANGE_SELECTION).toBe('today');
	});

	// SvelteDate extends the native Date, so this runs on the real clock.
	it('bounds "today" from local midnight, and the other ranges by hours back from now', () => {
		const before = Date.now();
		const today = getRangeBounds('today');
		const lastDay = getRangeBounds(24);
		const lastThreeDays = getRangeBounds(72);
		const after = Date.now();

		const end = Date.parse(today.end);
		expect(end).toBeGreaterThanOrEqual(before);
		expect(end).toBeLessThanOrEqual(after);
		const midnight = new Date(end);
		midnight.setHours(0, 0, 0, 0);
		expect(today.start).toBe(midnight.toISOString());
		expect(Date.parse(lastDay.end) - Date.parse(lastDay.start)).toBe(24 * HOUR);
		expect(Date.parse(lastThreeDays.end) - Date.parse(lastThreeDays.start)).toBe(72 * HOUR);
	});

	it('starts each route with nothing loaded', () => {
		expect(createRouteState()).toEqual({
			requestedHistoricalData: null,
			relayHistory: null,
			activeRange: null,
			fetching: false,
			fetchError: null
		});
		expect(createRouteState()).not.toBe(createRouteState());
		expect(createEmptyRelaySnapshot()).toEqual({
			historicalData: [],
			latestData: null,
			pendingRelayStates: {}
		});
	});
});

describe('relay labels and errors', () => {
	it('labels a requested and a reported relay state', () => {
		expect(getRelayTargetStateLabel('on')).toBe(relayStateLabel(true));
		expect(getRelayTargetStateLabel('off')).toBe(relayStateLabel(false));
		expect(getVerifiedRelayStateLabel(2, { created_at: T1, relay_1: false, relay_2: true })).toBe(
			relayStateLabel(true)
		);
		expect(getVerifiedRelayStateLabel(1, { created_at: T1, relay_1: 'x' })).toBe(
			m.display_unknown()
		);
		expect(getVerifiedRelayStateLabel(1, null)).toBe(m.display_unknown());
	});

	it('explains a failed relay command by its status', () => {
		expect(mapRelayApiErrorMessage(apiError(401))).toBe(m.devices_relay_downlink_not_authorized());
		expect(mapRelayApiErrorMessage(apiError(403))).toBe(m.devices_relay_downlink_not_authorized());
		expect(mapRelayApiErrorMessage(apiError(404))).toBe(
			m.devices_relay_downlink_target_not_found()
		);
		expect(mapRelayApiErrorMessage(apiError(429))).toBe(m.devices_relay_downlink_rate_limited());
		expect(mapRelayApiErrorMessage(apiError(500))).toBe(m.devices_relay_command_failed());
		expect(mapRelayApiErrorMessage(new Error('offline'))).toBe(m.devices_relay_command_failed());
	});
});

describe('buildSensorChartSeries', () => {
	it('plots every reported numeric column, oldest first, in the preferred units', () => {
		const series = buildSensorChartSeries(
			[
				{ created_at: T2, temperature_c: 21.5, smoke_detected: true, ec: '1.5' },
				{ created_at: T1, temperature_c: 20, smoke_detected: false, ec: '' }
			],
			FAHRENHEIT
		);

		expect(series.map((entry) => entry.id)).toEqual(['temperature_c', 'smoke_detected', 'ec']);
		const [temperature, smoke, ec] = series;
		expect(temperature).toEqual({
			id: 'temperature_c',
			label: labelFor('temperature_c').label(),
			unit: resolveDisplayUnit('temperature_c', FAHRENHEIT),
			color: metricColor('temperature_c').color,
			gradient: metricColor('temperature_c').gradient ?? false,
			data: [
				{ t: Date.parse(T1), v: convertSensorValue('temperature_c', 20, FAHRENHEIT) },
				{ t: Date.parse(T2), v: convertSensorValue('temperature_c', 21.5, FAHRENHEIT) }
			],
			decimals: 2
		});
		// Booleans plot as 0/1 and are drawn without decimals.
		expect(smoke.data).toEqual([
			{ t: Date.parse(T1), v: 0 },
			{ t: Date.parse(T2), v: 1 }
		]);
		expect(smoke.decimals).toBe(0);
		// A blank cell is a gap, not a zero.
		expect(ec.data).toEqual([{ t: Date.parse(T2), v: 1.5 }]);
	});

	it('skips identifiers, time columns, hidden columns and cells without a number', () => {
		const series = buildSensorChartSeries([
			{
				created_at: T1,
				updated_at: T1,
				location_id: 8,
				traffic_hour: 3,
				traffic_day: 2,
				line_number: 1,
				id: 7,
				battery: 90,
				note: 'text',
				pressure: Number.NaN,
				moisture: null
			},
			{ created_at: 'not a date', moisture: 31 }
		]);

		// `moisture` has a number, but only in a row without a valid time.
		expect(series).toEqual([]);
		expect(buildSensorChartSeries([])).toEqual([]);
	});
});

describe('buildDewPointChartSeries', () => {
	it('derives the dew point from rows with both temperature and humidity', () => {
		const series = buildDewPointChartSeries(
			[
				{ created_at: T2, temperature_c: '22', humidity: 60 },
				{ created_at: T1, temperature_c: 20, humidity: 50 },
				{ created_at: T1, temperature_c: 20 },
				{ created_at: T1, temperature_c: 20, humidity: 0 },
				{ created_at: 'never', temperature_c: 20, humidity: 50 }
			],
			FAHRENHEIT
		);

		expect(series).toEqual({
			id: DEW_POINT_SERIES_ID,
			label: labelFor(DEW_POINT_SERIES_ID).label(),
			unit: resolveDisplayUnit(DEW_POINT_SERIES_ID, FAHRENHEIT),
			color: metricColor(DEW_POINT_SERIES_ID).color,
			gradient: metricColor(DEW_POINT_SERIES_ID).gradient ?? false,
			data: [
				{
					t: Date.parse(T1),
					v: convertSensorValue(DEW_POINT_SERIES_ID, computeDewPoint(20, 50)!, FAHRENHEIT)
				},
				{
					t: Date.parse(T2),
					v: convertSensorValue(DEW_POINT_SERIES_ID, computeDewPoint(22, 60)!, FAHRENHEIT)
				}
			],
			decimals: 2
		});
	});

	it('is null when no row carries both readings', () => {
		expect(buildDewPointChartSeries([{ created_at: T1, temperature_c: 20 }])).toBeNull();
		expect(buildDewPointChartSeries([])).toBeNull();
	});
});
