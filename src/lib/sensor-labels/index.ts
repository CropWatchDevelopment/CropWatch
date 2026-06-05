import { m } from '$lib/paraglide/messages.js';

export type SensorFormat = 'number' | 'integer' | 'boolean';

export interface SensorLabel {
	label: () => string;
	unit: string;
	// `thermo` | `drop` | `co2` are named glyphs in CWUI's CwDataIcon; any other
	// string (e.g. the 📏 emoji) is rendered as-is by the card.
	icon?: 'thermo' | 'drop' | 'co2' | '📏';
	format: SensorFormat;
}

const SENSOR_LABELS: Record<string, SensorLabel> = {
	temperature_c: { label: () => m.sensor_temperature(), unit: '°C', icon: 'thermo', format: 'number' },
	humidity: { label: () => m.sensor_humidity(), unit: '%', icon: 'drop', format: 'number' },
	moisture: { label: () => m.sensor_moisture(), unit: '%', icon: 'drop', format: 'number' },
	co2: { label: () => m.sensor_co2(), unit: 'ppm', icon: 'co2', format: 'integer' },
	co: { label: () => m.sensor_co(), unit: 'ppm', format: 'integer' },
	pressure: { label: () => m.sensor_pressure(), unit: 'hPa', format: 'number' },
	ec: { label: () => m.sensor_ec(), unit: 'mS/cm', format: 'number' },
	ph: { label: () => m.sensor_ph(), unit: '', format: 'number' },
	deapth_cm: { label: () => m.sensor_depth(), unit: 'mm', icon: '📏', format: 'number' },
	battery: { label: () => m.sensor_battery(), unit: '%', format: 'integer' },
	battery_level: { label: () => m.sensor_battery(), unit: 'V', format: 'number' },
	voltage: { label: () => m.sensor_voltage(), unit: 'V', format: 'number' },
	current: { label: () => m.sensor_current(), unit: 'A', format: 'number' },
	watts: { label: () => m.sensor_watts(), unit: 'W', format: 'number' },
	rainfall: { label: () => m.sensor_rainfall(), unit: 'mm', format: 'number' },
	wind_speed: { label: () => m.sensor_wind_speed(), unit: 'm/s', format: 'number' },
	wind_direction: { label: () => m.sensor_wind_direction(), unit: '°', format: 'integer' },
	lux: { label: () => m.sensor_lux(), unit: 'lx', format: 'integer' },
	uv_index: { label: () => m.sensor_uv_index(), unit: '', format: 'integer' },
	smoke_detected: { label: () => m.sensor_smoke_detected(), unit: '', format: 'boolean' },
	vape_detected: { label: () => m.sensor_vape_detected(), unit: '', format: 'boolean' },
	spo2: { label: () => m.sensor_spo2(), unit: '%', format: 'number' },
	relay_1: { label: () => m.sensor_relay_1(), unit: '', format: 'boolean' },
	relay_2: { label: () => m.sensor_relay_2(), unit: '', format: 'boolean' },
	people_count: { label: () => m.sensor_people_count(), unit: '', format: 'integer' },
	car_count: { label: () => m.sensor_car_count(), unit: '', format: 'integer' }
};

const HIDDEN_COLUMNS = new Set(['dev_eui', 'id', 'is_simulated', 'last_update']);

export function labelFor(column: string): SensorLabel {
	return SENSOR_LABELS[column] ?? { label: () => column, unit: '', format: 'number' };
}

export function isDisplayableColumn(column: string): boolean {
	return !HIDDEN_COLUMNS.has(column);
}

export function formatSensorValue(
	value: unknown,
	format: SensorFormat
): { display: string; numeric: number | null } {
	if (value === null || value === undefined) {
		return { display: '—', numeric: null };
	}

	if (format === 'boolean') {
		const truthy =
			value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
		return { display: truthy ? m.sensor_value_on() : m.sensor_value_off(), numeric: truthy ? 1 : 0 };
	}

	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) {
		return { display: String(value), numeric: null };
	}

	if (format === 'integer') {
		return { display: Math.round(n).toLocaleString(), numeric: n };
	}

	return { display: n.toLocaleString(undefined, { maximumFractionDigits: 2 }), numeric: n };
}
