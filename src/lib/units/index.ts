/**
 * Unit conversion + formatting layer.
 *
 * Sensor values arrive from the API in fixed canonical units (see
 * `src/lib/sensor-labels`): temperature °C, water level mm (the `deapth_cm` field
 * name is a misnomer — the value is millimetres), EC mS/cm (= dS/m), CO₂ ppm,
 * pressure hPa, rainfall mm, wind m/s, moisture % VWC. This module converts those
 * canonical values into the unit the user picked in `profile_preferences` and
 * formats them (delegating number formatting to `$lib/i18n/format`).
 *
 * It is the single source of truth for the unit option lists too (the settings
 * form imports them from here) so convert-from ↔ convert-to never drift.
 */
import type { PreferencesDto } from '$lib/api/api.dtos';
import { formatNumber } from '$lib/i18n/format';
import { labelFor } from '$lib/sensor-labels';

export type Quantity =
	| 'temperature'
	| 'water_level'
	| 'ec'
	| 'co2'
	| 'pressure'
	| 'rainfall'
	| 'wind_speed'
	| 'soil_moisture';

/**
 * Sensor field name → the quantity it measures (drives convert-from + which pref
 * to read). Soil `moisture` is intentionally omitted: VWC% → relative%/kPa/centibar
 * is soil-model dependent, so moisture always displays as canonical % (the stored
 * soil_moisture preference is a no-op for now).
 */
export const QUANTITY_BY_FIELD: Record<string, Quantity> = {
	temperature_c: 'temperature',
	deapth_cm: 'water_level',
	depth_cm: 'water_level',
	ec: 'ec',
	co2: 'co2',
	pressure: 'pressure',
	rainfall: 'rainfall',
	wind_speed: 'wind_speed'
};

/** Display symbol per target unit value. */
const UNIT_SYMBOLS: Record<string, string> = {
	// temperature
	celsius: '°C',
	fahrenheit: '°F',
	kelvin: 'K',
	// water level / rainfall
	mm: 'mm',
	cm: 'cm',
	inch: 'in',
	foot: 'ft',
	meter: 'm',
	yard: 'yd',
	in: 'in',
	// EC (dS/m is the standard notation; "dS/cm" was a mislabel)
	ms_cm: 'mS/cm',
	ds_cm: 'dS/m',
	us_cm: 'µS/cm',
	// pressure
	hpa: 'hPa',
	kpa: 'kPa',
	bar: 'bar',
	psi: 'psi',
	// wind
	m_s: 'm/s',
	km_h: 'km/h',
	mph: 'mph',
	kt: 'kt',
	// CO₂
	ppm: 'ppm',
	mg_m3: 'mg/m³'
};

function convertTemperature(celsius: number, unit: string): number {
	if (unit === 'fahrenheit') return (celsius * 9) / 5 + 32;
	if (unit === 'kelvin') return celsius + 273.15;
	return celsius;
}

function convertWaterLevel(mm: number, unit: string): number {
	switch (unit) {
		case 'cm':
			return mm / 10;
		case 'inch':
			return mm / 25.4;
		case 'foot':
			return mm / 304.8;
		case 'meter':
			return mm / 1000;
		case 'yard':
			return mm / 914.4;
		default:
			return mm; // mm
	}
}

function convertEc(msCm: number, unit: string): number {
	// ms_cm and ds_cm are numerically identical (dS/m = mS/cm) — only the notation differs.
	return unit === 'us_cm' ? msCm * 1000 : msCm;
}

function convertPressure(hpa: number, unit: string): number {
	switch (unit) {
		case 'kpa':
			return hpa / 10;
		case 'bar':
			return hpa / 1000;
		case 'psi':
			return hpa * 0.0145037738;
		default:
			return hpa; // hpa
	}
}

function convertRainfall(mm: number, unit: string): number {
	if (unit === 'cm') return mm / 10;
	if (unit === 'in') return mm / 25.4;
	return mm; // mm
}

function convertWindSpeed(ms: number, unit: string): number {
	switch (unit) {
		case 'km_h':
			return ms * 3.6;
		case 'mph':
			return ms * 2.2369362920544;
		case 'kt':
			return ms * 1.9438444924406;
		default:
			return ms; // m_s
	}
}

function convertCo2(ppm: number, unit: string): number {
	// mg/m³ ≈ ppm × 1.8 at 25 °C / 1 atm (approximation; exact value is T/P dependent).
	return unit === 'mg_m3' ? ppm * 1.8 : ppm;
}

function convert(quantity: Quantity, value: number, targetUnit: string): number {
	switch (quantity) {
		case 'temperature':
			return convertTemperature(value, targetUnit);
		case 'water_level':
			return convertWaterLevel(value, targetUnit);
		case 'ec':
			return convertEc(value, targetUnit);
		case 'co2':
			return convertCo2(value, targetUnit);
		case 'pressure':
			return convertPressure(value, targetUnit);
		case 'rainfall':
			return convertRainfall(value, targetUnit);
		case 'wind_speed':
			return convertWindSpeed(value, targetUnit);
		case 'soil_moisture':
			return value; // VWC% → other units is soil-model dependent; passthrough.
	}
}

function prefUnitFor(quantity: Quantity, preferences?: PreferencesDto | null): string | null {
	if (!preferences) return null;
	switch (quantity) {
		case 'temperature':
			return preferences.temperature_unit;
		case 'water_level':
			return preferences.water_level_unit;
		case 'ec':
			return preferences.ec_unit;
		case 'co2':
			return preferences.co2_unit;
		case 'pressure':
			return preferences.pressure_unit;
		case 'rainfall':
			return preferences.rainfall_unit;
		case 'wind_speed':
			return preferences.wind_speed_unit;
		case 'soil_moisture':
			return preferences.soil_moisture_unit;
	}
}

/** The display unit symbol for a field, honouring preferences (else the canonical unit). */
export function resolveDisplayUnit(field: string, preferences?: PreferencesDto | null): string {
	const quantity = QUANTITY_BY_FIELD[field];
	if (quantity) {
		const target = prefUnitFor(quantity, preferences);
		if (target && UNIT_SYMBOLS[target]) return UNIT_SYMBOLS[target];
	}
	return labelFor(field).unit;
}

/** Convert a canonical sensor value into the user's preferred unit (identity when no pref). */
export function convertSensorValue(
	field: string,
	value: number,
	preferences?: PreferencesDto | null
): number {
	const quantity = QUANTITY_BY_FIELD[field];
	if (!quantity) return value;
	const target = prefUnitFor(quantity, preferences);
	if (!target) return value;
	return convert(quantity, value, target);
}

export interface FormattedMeasurement {
	/** Converted numeric value (null when the input is missing/non-numeric). */
	value: number | null;
	/** Display unit symbol (may be ''). */
	unit: string;
	/** Localised number without the unit, or '—' when missing. */
	valueDisplay: string;
	/** Localised number + unit, or '—' when missing. */
	display: string;
}

function defaultFractionDigits(field: string): number {
	return labelFor(field).format === 'integer' ? 0 : 2;
}

/**
 * Format a sensor reading in the user's preferred unit.
 * `preferences` is passed explicitly so this works in components, dialogs, and
 * non-component code alike.
 */
export function formatSensorMeasurement(
	field: string,
	value: unknown,
	preferences?: PreferencesDto | null,
	options?: { maximumFractionDigits?: number; withUnit?: boolean }
): FormattedMeasurement {
	const unit = resolveDisplayUnit(field, preferences);

	if (value === null || value === undefined) {
		return { value: null, unit, valueDisplay: '—', display: '—' };
	}
	const n = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(n)) {
		const raw = String(value);
		return { value: null, unit, valueDisplay: raw, display: raw };
	}

	const converted = convertSensorValue(field, n, preferences);
	const maximumFractionDigits = options?.maximumFractionDigits ?? defaultFractionDigits(field);
	const numberStr = formatNumber(converted, { maximumFractionDigits });
	const display = options?.withUnit === false || !unit ? numberStr : `${numberStr} ${unit}`;

	return { value: converted, unit, valueDisplay: numberStr, display };
}

// ---------------------------------------------------------------------------
// Unit option lists — the single source of truth shared by the settings form
// (`/settings`) and this conversion layer. Values must match the DB CHECK
// constraints on `profile_preferences` and the UNIT_SYMBOLS keys above.
// ---------------------------------------------------------------------------

export interface UnitOption {
	label: string;
	value: string;
}

export const temperatureUnitOptions: UnitOption[] = [
	{ label: 'Celsius (°C)', value: 'celsius' },
	{ label: 'Fahrenheit (°F)', value: 'fahrenheit' },
	{ label: 'Kelvin (K)', value: 'kelvin' }
];

export const weightUnitOptions: UnitOption[] = [
	{ label: 'Kilograms (kg)', value: 'kg' },
	{ label: 'Pounds (lb)', value: 'lb' }
];

export const ecUnitOptions: UnitOption[] = [
	{ label: 'mS/cm', value: 'ms_cm' },
	{ label: 'dS/m', value: 'ds_cm' },
	{ label: 'µS/cm', value: 'us_cm' }
];

export const waterLevelUnitOptions: UnitOption[] = [
	{ label: 'Millimeters (mm)', value: 'mm' },
	{ label: 'Centimeters (cm)', value: 'cm' },
	{ label: 'Inches (in)', value: 'inch' },
	{ label: 'Feet (ft)', value: 'foot' },
	{ label: 'Meters (m)', value: 'meter' },
	{ label: 'Yards (yd)', value: 'yard' }
];

// One representative major city per UTC offset (value is the IANA zone).
export const timezoneOptions: UnitOption[] = [
	{ label: '(UTC-11:00) Pago Pago', value: 'Pacific/Pago_Pago' },
	{ label: '(UTC-10:00) Honolulu', value: 'Pacific/Honolulu' },
	{ label: '(UTC-09:00) Anchorage', value: 'America/Anchorage' },
	{ label: '(UTC-08:00) Los Angeles', value: 'America/Los_Angeles' },
	{ label: '(UTC-07:00) Denver', value: 'America/Denver' },
	{ label: '(UTC-06:00) Mexico City', value: 'America/Mexico_City' },
	{ label: '(UTC-05:00) New York', value: 'America/New_York' },
	{ label: '(UTC-04:00) Santiago', value: 'America/Santiago' },
	{ label: '(UTC-03:00) Sao Paulo', value: 'America/Sao_Paulo' },
	{ label: '(UTC-01:00) Azores', value: 'Atlantic/Azores' },
	{ label: '(UTC+00:00) London', value: 'Europe/London' },
	{ label: '(UTC+01:00) Paris', value: 'Europe/Paris' },
	{ label: '(UTC+02:00) Cairo', value: 'Africa/Cairo' },
	{ label: '(UTC+03:00) Moscow', value: 'Europe/Moscow' },
	{ label: '(UTC+03:30) Tehran', value: 'Asia/Tehran' },
	{ label: '(UTC+04:00) Dubai', value: 'Asia/Dubai' },
	{ label: '(UTC+05:00) Karachi', value: 'Asia/Karachi' },
	{ label: '(UTC+05:30) Mumbai', value: 'Asia/Kolkata' },
	{ label: '(UTC+05:45) Kathmandu', value: 'Asia/Kathmandu' },
	{ label: '(UTC+06:00) Dhaka', value: 'Asia/Dhaka' },
	{ label: '(UTC+07:00) Bangkok', value: 'Asia/Bangkok' },
	{ label: '(UTC+08:00) Shanghai', value: 'Asia/Shanghai' },
	{ label: '(UTC+09:00) Tokyo', value: 'Asia/Tokyo' },
	{ label: '(UTC+09:30) Adelaide', value: 'Australia/Adelaide' },
	{ label: '(UTC+10:00) Sydney', value: 'Australia/Sydney' },
	{ label: '(UTC+11:00) Noumea', value: 'Pacific/Noumea' },
	{ label: '(UTC+12:00) Auckland', value: 'Pacific/Auckland' }
];

export const soilMoistureUnitOptions: UnitOption[] = [
	{ label: 'VWC (%)', value: 'vwc_percent' },
	{ label: 'Relative saturation (%)', value: 'relative_percent' },
	{ label: 'kPa', value: 'kpa' },
	{ label: 'centibar', value: 'centibar' }
];

export const rainfallUnitOptions: UnitOption[] = [
	{ label: 'Millimeters (mm)', value: 'mm' },
	{ label: 'Centimeters (cm)', value: 'cm' },
	{ label: 'Inches (in)', value: 'in' }
];

export const windSpeedUnitOptions: UnitOption[] = [
	{ label: 'Meters per second (m/s)', value: 'm_s' },
	{ label: 'Kilometers per hour (km/h)', value: 'km_h' },
	{ label: 'Miles per hour (mph)', value: 'mph' },
	{ label: 'Knots (kt)', value: 'kt' }
];

export const pressureUnitOptions: UnitOption[] = [
	{ label: 'hPa', value: 'hpa' },
	{ label: 'kPa', value: 'kpa' },
	{ label: 'bar', value: 'bar' },
	{ label: 'PSI', value: 'psi' }
];

export const co2UnitOptions: UnitOption[] = [
	{ label: 'PPM', value: 'ppm' },
	{ label: 'mg/m³', value: 'mg_m3' }
];

export const distanceUnitOptions: UnitOption[] = [
	{ label: 'Kilometers (km)', value: 'km' },
	{ label: 'Miles (mi)', value: 'mi' }
];

export const areaUnitOptions: UnitOption[] = [
	{ label: 'Hectares (ha)', value: 'hectares' },
	{ label: 'Acres (ac)', value: 'acres' },
	{ label: 'Square meters (m2)', value: 'square_meters' }
];

export const dateFormatOptions: UnitOption[] = [
	{ label: 'YYYY-MM-DD', value: 'yyyy_mm_dd' },
	{ label: 'DD/MM/YYYY', value: 'dd_mm_yyyy' },
	{ label: 'MM/DD/YYYY', value: 'mm_dd_yyyy' }
];

export const timeFormatOptions: UnitOption[] = [
	{ label: '24-hour', value: '24h' },
	{ label: '12-hour', value: '12h' }
];

export const decimalSeparatorOptions: UnitOption[] = [
	{ label: 'Dot (1,234.56)', value: 'dot' },
	{ label: 'Comma (1.234,56)', value: 'comma' }
];
