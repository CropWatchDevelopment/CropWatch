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
import { m } from '$lib/paraglide/messages.js';
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
 *
 * Boolean-format fields (relay states, smoke/vape detection, …) render as the
 * localised On/Off words with no unit, so callers never need a separate
 * formatting path for non-numeric sensors.
 */
export function formatSensorMeasurement(
	field: string,
	value: unknown,
	preferences?: PreferencesDto | null,
	options?: { maximumFractionDigits?: number; withUnit?: boolean }
): FormattedMeasurement {
	if (labelFor(field).format === 'boolean') {
		if (value === null || value === undefined) {
			return { value: null, unit: '', valueDisplay: '—', display: '—' };
		}
		const truthy =
			value === true || value === 'true' || value === 1 || value === '1' || value === 'on';
		const word = truthy ? m.sensor_value_on() : m.sensor_value_off();
		return { value: truthy ? 1 : 0, unit: '', valueDisplay: word, display: word };
	}

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
//
// Each list is exposed as a getter (not a module-level constant) so the
// Paraglide `m.*()` label calls resolve against the locale of the request /
// render that consumes them rather than freezing at import time.
// ---------------------------------------------------------------------------

export interface UnitOption {
	label: string;
	value: string;
}

export function getTemperatureUnitOptions(): UnitOption[] {
	return [
		{ label: m.unit_celsius(), value: 'celsius' },
		{ label: m.unit_fahrenheit(), value: 'fahrenheit' },
		{ label: m.unit_kelvin(), value: 'kelvin' }
	];
}

export function getWeightUnitOptions(): UnitOption[] {
	return [
		{ label: m.unit_kilograms(), value: 'kg' },
		{ label: m.unit_pounds(), value: 'lb' }
	];
}

// EC labels are pure unit symbols — nothing to translate.
export function getEcUnitOptions(): UnitOption[] {
	return [
		{ label: 'mS/cm', value: 'ms_cm' },
		{ label: 'dS/m', value: 'ds_cm' },
		{ label: 'µS/cm', value: 'us_cm' }
	];
}

export function getWaterLevelUnitOptions(): UnitOption[] {
	return [
		{ label: m.unit_millimeters(), value: 'mm' },
		{ label: m.unit_centimeters(), value: 'cm' },
		{ label: m.unit_inches(), value: 'inch' },
		{ label: m.unit_feet(), value: 'foot' },
		{ label: m.unit_meters(), value: 'meter' },
		{ label: m.unit_yards(), value: 'yard' }
	];
}

// One representative major city per UTC offset (value is the IANA zone).
export function getTimezoneOptions(): UnitOption[] {
	return [
		{ label: m.unit_tz_pago_pago(), value: 'Pacific/Pago_Pago' },
		{ label: m.unit_tz_honolulu(), value: 'Pacific/Honolulu' },
		{ label: m.unit_tz_anchorage(), value: 'America/Anchorage' },
		{ label: m.unit_tz_los_angeles(), value: 'America/Los_Angeles' },
		{ label: m.unit_tz_denver(), value: 'America/Denver' },
		{ label: m.unit_tz_mexico_city(), value: 'America/Mexico_City' },
		{ label: m.unit_tz_new_york(), value: 'America/New_York' },
		{ label: m.unit_tz_santiago(), value: 'America/Santiago' },
		{ label: m.unit_tz_sao_paulo(), value: 'America/Sao_Paulo' },
		{ label: m.unit_tz_azores(), value: 'Atlantic/Azores' },
		{ label: m.unit_tz_london(), value: 'Europe/London' },
		{ label: m.unit_tz_paris(), value: 'Europe/Paris' },
		{ label: m.unit_tz_cairo(), value: 'Africa/Cairo' },
		{ label: m.unit_tz_moscow(), value: 'Europe/Moscow' },
		{ label: m.unit_tz_tehran(), value: 'Asia/Tehran' },
		{ label: m.unit_tz_dubai(), value: 'Asia/Dubai' },
		{ label: m.unit_tz_karachi(), value: 'Asia/Karachi' },
		{ label: m.unit_tz_mumbai(), value: 'Asia/Kolkata' },
		{ label: m.unit_tz_kathmandu(), value: 'Asia/Kathmandu' },
		{ label: m.unit_tz_dhaka(), value: 'Asia/Dhaka' },
		{ label: m.unit_tz_bangkok(), value: 'Asia/Bangkok' },
		{ label: m.unit_tz_shanghai(), value: 'Asia/Shanghai' },
		{ label: m.unit_tz_tokyo(), value: 'Asia/Tokyo' },
		{ label: m.unit_tz_adelaide(), value: 'Australia/Adelaide' },
		{ label: m.unit_tz_sydney(), value: 'Australia/Sydney' },
		{ label: m.unit_tz_noumea(), value: 'Pacific/Noumea' },
		{ label: m.unit_tz_auckland(), value: 'Pacific/Auckland' }
	];
}

export function getSoilMoistureUnitOptions(): UnitOption[] {
	return [
		{ label: 'VWC (%)', value: 'vwc_percent' },
		{ label: m.unit_relative_saturation(), value: 'relative_percent' },
		{ label: 'kPa', value: 'kpa' },
		{ label: m.unit_centibar(), value: 'centibar' }
	];
}

export function getRainfallUnitOptions(): UnitOption[] {
	return [
		{ label: m.unit_millimeters(), value: 'mm' },
		{ label: m.unit_centimeters(), value: 'cm' },
		{ label: m.unit_inches(), value: 'in' }
	];
}

export function getWindSpeedUnitOptions(): UnitOption[] {
	return [
		{ label: m.unit_meters_per_second(), value: 'm_s' },
		{ label: m.unit_kilometers_per_hour(), value: 'km_h' },
		{ label: m.unit_miles_per_hour(), value: 'mph' },
		{ label: m.unit_knots(), value: 'kt' }
	];
}

// Pressure labels are pure unit symbols — nothing to translate.
export function getPressureUnitOptions(): UnitOption[] {
	return [
		{ label: 'hPa', value: 'hpa' },
		{ label: 'kPa', value: 'kpa' },
		{ label: 'bar', value: 'bar' },
		{ label: 'PSI', value: 'psi' }
	];
}

// CO₂ labels are pure unit symbols — nothing to translate.
export function getCo2UnitOptions(): UnitOption[] {
	return [
		{ label: 'PPM', value: 'ppm' },
		{ label: 'mg/m³', value: 'mg_m3' }
	];
}

export function getDistanceUnitOptions(): UnitOption[] {
	return [
		{ label: m.unit_kilometers(), value: 'km' },
		{ label: m.unit_miles(), value: 'mi' }
	];
}

export function getAreaUnitOptions(): UnitOption[] {
	return [
		{ label: m.unit_hectares(), value: 'hectares' },
		{ label: m.unit_acres(), value: 'acres' },
		{ label: m.unit_square_meters(), value: 'square_meters' }
	];
}

// Date-format labels are literal pattern notation — nothing to translate.
export function getDateFormatOptions(): UnitOption[] {
	return [
		{ label: 'YYYY-MM-DD', value: 'yyyy_mm_dd' },
		{ label: 'DD/MM/YYYY', value: 'dd_mm_yyyy' },
		{ label: 'MM/DD/YYYY', value: 'mm_dd_yyyy' }
	];
}

export function getTimeFormatOptions(): UnitOption[] {
	return [
		{ label: m.unit_time_24h(), value: '24h' },
		{ label: m.unit_time_12h(), value: '12h' }
	];
}

export function getDecimalSeparatorOptions(): UnitOption[] {
	return [
		{ label: m.unit_decimal_dot(), value: 'dot' },
		{ label: m.unit_decimal_comma(), value: 'comma' }
	];
}
