import { describe, expect, it } from 'vitest';
import { RELAY_STATE_ICONS } from '$lib/devices/relay-labels';
import { m } from '$lib/paraglide/messages.js';
import {
	isDisplayableColumn,
	isOnValue,
	labelFor,
	sensorStateIcon,
	type SensorFormat
} from './index';

describe('labelFor', () => {
	// column, translated label, canonical unit, number format, icon
	const KNOWN: [string, () => string, string, SensorFormat, string | undefined][] = [
		['temperature_c', m.sensor_temperature, '°C', 'number', 'thermo'],
		['humidity', m.sensor_humidity, '%', 'number', 'drop'],
		['dew_point', m.sensor_dew_point, '°C', 'number', 'thermo'],
		['moisture', m.sensor_moisture, '%', 'number', 'drop'],
		['co2', m.sensor_co2, 'ppm', 'integer', 'co2'],
		['co', m.sensor_co, 'ppm', 'integer', undefined],
		['pressure', m.sensor_pressure, 'hPa', 'number', undefined],
		['ec', m.sensor_ec, 'mS/cm', 'number', undefined],
		['ph', m.sensor_ph, '', 'number', undefined],
		// The water-level column is spelled `deapth_cm` but holds millimetres.
		['deapth_cm', m.sensor_depth, 'mm', 'number', '📏'],
		// …and also arrives under its correct spelling.
		['depth_cm', m.sensor_depth, 'mm', 'number', '📏'],
		['battery', m.sensor_battery, '%', 'integer', undefined],
		['battery_level', m.sensor_battery, 'V', 'number', undefined],
		['voltage', m.sensor_voltage, 'V', 'number', undefined],
		['current', m.sensor_current, 'A', 'number', undefined],
		['watts', m.sensor_watts, 'W', 'number', undefined],
		['rainfall', m.sensor_rainfall, 'mm', 'number', undefined],
		['wind_speed', m.sensor_wind_speed, 'm/s', 'number', undefined],
		['wind_direction', m.sensor_wind_direction, '°', 'integer', undefined],
		['lux', m.sensor_lux, 'lx', 'integer', undefined],
		['uv_index', m.sensor_uv_index, '', 'integer', undefined],
		['smoke_detected', m.sensor_smoke_detected, '', 'boolean', undefined],
		['vape_detected', m.sensor_vape_detected, '', 'boolean', undefined],
		['spo2', m.sensor_spo2, '%', 'number', undefined],
		['relay_1', m.sensor_relay_1, '', 'boolean', undefined],
		['relay_2', m.sensor_relay_2, '', 'boolean', undefined],
		['people_count', m.sensor_people_count, '', 'integer', '🚶'],
		['car_count', m.sensor_car_count, '', 'integer', '🚗'],
		['bicycle_count', m.traffic_metric_bicycle_count, '', 'integer', '🚲'],
		['bus_count', m.traffic_metric_bus_count, '', 'integer', '🚌'],
		['motorcycle_count', m.traffic_metric_motorcycle_count, '', 'integer', '🏍️'],
		['train_count', m.traffic_metric_train_count, '', 'integer', '🚆'],
		['truck_count', m.traffic_metric_truck_count, '', 'integer', '🚚'],
		['traffic_hour', m.traffic_hour, '', 'number', undefined]
	];

	it.each(KNOWN)('describes %s', (column, message, unit, format, icon) => {
		const label = labelFor(column);

		expect(label.label()).toBe(message());
		expect(label.unit).toBe(unit);
		expect(label.format).toBe(format);
		expect(label.icon).toBe(icon);
	});

	it('gives only the relays a per-state icon', () => {
		expect(labelFor('relay_1').stateIcons).toBe(RELAY_STATE_ICONS);
		expect(labelFor('relay_2').stateIcons).toBe(RELAY_STATE_ICONS);
		for (const [column] of KNOWN.filter(([column]) => !column.startsWith('relay_'))) {
			expect(labelFor(column).stateIcons).toBeUndefined();
		}
	});

	it('shows an unknown column under its own name as a plain number', () => {
		const label = labelFor('soil_salinity');

		expect(label.label()).toBe('soil_salinity');
		expect(label).toMatchObject({ unit: '', format: 'number' });
		expect(label.icon).toBeUndefined();
		expect(label.stateIcons).toBeUndefined();
	});
});

describe('isOnValue', () => {
	it('reads true, 1 and their text forms, and "on", as on', () => {
		for (const value of [true, 1, '1', 'true', 'on']) {
			expect(isOnValue(value)).toBe(true);
		}
	});

	it('reads everything else as off', () => {
		for (const value of [
			false,
			0,
			'0',
			'false',
			'off',
			'ON',
			'TRUE',
			2,
			'yes',
			'',
			null,
			undefined
		]) {
			expect(isOnValue(value)).toBe(false);
		}
	});
});

describe('isDisplayableColumn', () => {
	it('hides battery telemetry columns from all displays', () => {
		expect(isDisplayableColumn('battery')).toBe(false);
		expect(isDisplayableColumn('battery_level')).toBe(false);
	});

	it('keeps voltage and regular sensor columns visible', () => {
		expect(isDisplayableColumn('voltage')).toBe(true);
		expect(isDisplayableColumn('temperature_c')).toBe(true);
	});

	it('hides metadata columns', () => {
		expect(isDisplayableColumn('dev_eui')).toBe(false);
		expect(isDisplayableColumn('is_simulated')).toBe(false);
	});

	it('hides the row bookkeeping columns', () => {
		expect(isDisplayableColumn('id')).toBe(false);
		expect(isDisplayableColumn('last_update')).toBe(false);
		expect(isDisplayableColumn('line_number')).toBe(false);
	});

	it('keeps columns it does not know', () => {
		expect(isDisplayableColumn('soil_salinity')).toBe(true);
	});
});

describe('sensorStateIcon', () => {
	it('shows 🟢 for an on relay and 🔴 for an off relay, however the value is encoded', () => {
		for (const on of [true, 1, '1', 'true', 'on']) {
			expect(sensorStateIcon('relay_1', on)).toBe('🟢');
		}
		for (const off of [false, 0, '0', 'false', 'off']) {
			expect(sensorStateIcon('relay_2', off)).toBe('🔴');
		}
	});

	it('shows nothing for a relay without a reading', () => {
		expect(sensorStateIcon('relay_1', null)).toBeUndefined();
		expect(sensorStateIcon('relay_1', undefined)).toBeUndefined();
	});

	it('never colours smoke/vape detection or numeric readings', () => {
		expect(sensorStateIcon('smoke_detected', true)).toBeUndefined();
		expect(sensorStateIcon('vape_detected', false)).toBeUndefined();
		expect(sensorStateIcon('temperature_c', 21.5)).toBeUndefined();
	});

	it('shows nothing for a column it does not know', () => {
		expect(sensorStateIcon('soil_salinity', true)).toBeUndefined();
	});
});
