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
	temperature_c: {
		label: () => m.sensor_temperature(),
		unit: '°C',
		icon: 'thermo',
		format: 'number'
	},
	humidity: { label: () => m.sensor_humidity(), unit: '%', icon: 'drop', format: 'number' },
	// Derived client-side from temperature + humidity — not a stored column.
	dew_point: { label: () => m.sensor_dew_point(), unit: '°C', icon: 'thermo', format: 'number' },
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
	car_count: { label: () => m.sensor_car_count(), unit: '', format: 'integer' },
	bicycle_count: { label: () => m.traffic_metric_bicycle_count(), unit: '', format: 'integer' },
	bus_count: { label: () => m.traffic_metric_bus_count(), unit: '', format: 'integer' },
	motorcycle_count: {
		label: () => m.traffic_metric_motorcycle_count(),
		unit: '',
		format: 'integer'
	},
	train_count: { label: () => m.traffic_metric_train_count(), unit: '', format: 'integer' },
	truck_count: { label: () => m.traffic_metric_truck_count(), unit: '', format: 'integer' },
	// Hourly accumulator bucket start (cw_traffic2) — a timestamp, not a reading.
	traffic_hour: { label: () => m.traffic_hour(), unit: '', format: 'number' }
};

const HIDDEN_COLUMNS = new Set(['dev_eui', 'id', 'is_simulated', 'last_update', 'line_number']);

export function labelFor(column: string): SensorLabel {
	return SENSOR_LABELS[column] ?? { label: () => column, unit: '', format: 'number' };
}

export function isDisplayableColumn(column: string): boolean {
	return !HIDDEN_COLUMNS.has(column);
}
