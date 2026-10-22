import { describe, expect, it } from 'vitest';
import { CW_EMPTY_VALUE } from '@cropwatchdevelopment/cwui';
import type { PreferencesDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import {
	QUANTITY_BY_FIELD,
	convertSensorValue,
	formatSensorMeasurement,
	getAreaUnitOptions,
	getCo2UnitOptions,
	getDateFormatOptions,
	getDistanceUnitOptions,
	getEcUnitOptions,
	getPressureUnitOptions,
	getRainfallUnitOptions,
	getSoilMoistureUnitOptions,
	getTemperatureUnitOptions,
	getTimeFormatOptions,
	getTimezoneOptions,
	getWaterLevelUnitOptions,
	getWeightUnitOptions,
	getWindSpeedUnitOptions,
	resolveDisplayUnit
} from './index';

/** Preferences with no unit chosen (every reading stays canonical) plus `overrides`. */
function prefs(overrides: Record<string, string | null> = {}): PreferencesDto {
	return {
		user_id: 'user-1',
		theme: null,
		temperature_unit: null,
		weight_unit: null,
		ec_unit: null,
		water_level_unit: null,
		timezone: null,
		distance_unit: null,
		area_unit: null,
		soil_moisture_unit: null,
		pressure_unit: null,
		rainfall_unit: null,
		wind_speed_unit: null,
		co2_unit: null,
		date_format: null,
		time_format: null,
		...overrides
	} as PreferencesDto;
}

describe('QUANTITY_BY_FIELD', () => {
	it('maps the convertible sensor columns to what they measure, leaving soil moisture out', () => {
		expect(QUANTITY_BY_FIELD).toEqual({
			temperature_c: 'temperature',
			dew_point: 'temperature',
			deapth_cm: 'water_level',
			depth_cm: 'water_level',
			ec: 'ec',
			co2: 'co2',
			pressure: 'pressure',
			rainfall: 'rainfall',
			wind_speed: 'wind_speed'
		});
		expect(QUANTITY_BY_FIELD.moisture).toBeUndefined();
	});
});

describe('resolveDisplayUnit', () => {
	it('uses the canonical unit without preferences', () => {
		expect(resolveDisplayUnit('temperature_c')).toBe('°C');
		expect(resolveDisplayUnit('temperature_c', null)).toBe('°C');
		expect(resolveDisplayUnit('deapth_cm', prefs())).toBe('mm');
		expect(resolveDisplayUnit('humidity')).toBe('%');
		expect(resolveDisplayUnit('soil_salinity')).toBe('');
		// `depth_cm` is the same water level as `deapth_cm`, in millimetres.
		expect(resolveDisplayUnit('depth_cm')).toBe('mm');
		expect(resolveDisplayUnit('depth_cm', prefs())).toBe('mm');
	});

	it.each([
		['temperature_c', { temperature_unit: 'fahrenheit' }, '°F'],
		['temperature_c', { temperature_unit: 'kelvin' }, 'K'],
		['dew_point', { temperature_unit: 'celsius' }, '°C'],
		['deapth_cm', { water_level_unit: 'mm' }, 'mm'],
		['deapth_cm', { water_level_unit: 'cm' }, 'cm'],
		['deapth_cm', { water_level_unit: 'inch' }, 'in'],
		['deapth_cm', { water_level_unit: 'foot' }, 'ft'],
		['depth_cm', { water_level_unit: 'meter' }, 'm'],
		['depth_cm', { water_level_unit: 'yard' }, 'yd'],
		['ec', { ec_unit: 'ms_cm' }, 'mS/cm'],
		['ec', { ec_unit: 'ds_cm' }, 'dS/m'],
		['ec', { ec_unit: 'us_cm' }, 'µS/cm'],
		['co2', { co2_unit: 'ppm' }, 'ppm'],
		['co2', { co2_unit: 'mg_m3' }, 'mg/m³'],
		['pressure', { pressure_unit: 'hpa' }, 'hPa'],
		['pressure', { pressure_unit: 'kpa' }, 'kPa'],
		['pressure', { pressure_unit: 'bar' }, 'bar'],
		['pressure', { pressure_unit: 'psi' }, 'psi'],
		['rainfall', { rainfall_unit: 'mm' }, 'mm'],
		['rainfall', { rainfall_unit: 'cm' }, 'cm'],
		['rainfall', { rainfall_unit: 'in' }, 'in'],
		['wind_speed', { wind_speed_unit: 'm_s' }, 'm/s'],
		['wind_speed', { wind_speed_unit: 'km_h' }, 'km/h'],
		['wind_speed', { wind_speed_unit: 'mph' }, 'mph'],
		['wind_speed', { wind_speed_unit: 'kt' }, 'kt']
	])('shows %s with %o in %s', (field, preference, symbol) => {
		expect(resolveDisplayUnit(field, prefs(preference))).toBe(symbol);
	});

	it('keeps the canonical unit when the preferred unit has no symbol', () => {
		expect(resolveDisplayUnit('temperature_c', prefs({ temperature_unit: 'rankine' }))).toBe('°C');
		expect(resolveDisplayUnit('pressure', prefs({ pressure_unit: 'atm' }))).toBe('hPa');
	});

	it('keeps the canonical unit for fields that never convert', () => {
		expect(resolveDisplayUnit('humidity', prefs({ temperature_unit: 'fahrenheit' }))).toBe('%');
		// The soil-moisture preference is stored but not applied yet.
		expect(resolveDisplayUnit('moisture', prefs({ soil_moisture_unit: 'kpa' }))).toBe('%');
	});
});

describe('convertSensorValue', () => {
	it('returns the canonical value without preferences or a preferred unit', () => {
		expect(convertSensorValue('temperature_c', 20)).toBe(20);
		expect(convertSensorValue('temperature_c', 20, null)).toBe(20);
		expect(convertSensorValue('temperature_c', 20, prefs())).toBe(20);
		expect(convertSensorValue('temperature_c', 20, prefs({ pressure_unit: 'kpa' }))).toBe(20);
	});

	it('never converts fields without a quantity', () => {
		expect(convertSensorValue('humidity', 55, prefs({ temperature_unit: 'fahrenheit' }))).toBe(55);
		expect(convertSensorValue('moisture', 31, prefs({ soil_moisture_unit: 'kpa' }))).toBe(31);
	});

	it('converts temperature from °C', () => {
		expect(convertSensorValue('temperature_c', 20, prefs({ temperature_unit: 'fahrenheit' }))).toBe(
			68
		);
		expect(convertSensorValue('dew_point', -40, prefs({ temperature_unit: 'fahrenheit' }))).toBe(
			-40
		);
		expect(
			convertSensorValue('temperature_c', 20, prefs({ temperature_unit: 'kelvin' }))
		).toBeCloseTo(293.15, 10);
		expect(convertSensorValue('temperature_c', 20, prefs({ temperature_unit: 'celsius' }))).toBe(
			20
		);
		expect(convertSensorValue('temperature_c', 20, prefs({ temperature_unit: 'rankine' }))).toBe(
			20
		);
	});

	it('converts water level from mm', () => {
		const level = (unit: string) =>
			convertSensorValue('deapth_cm', 1000, prefs({ water_level_unit: unit }));

		expect(level('cm')).toBe(100);
		expect(level('inch')).toBeCloseTo(39.3700787, 6);
		expect(level('foot')).toBeCloseTo(3.2808399, 6);
		expect(level('meter')).toBe(1);
		expect(level('yard')).toBeCloseTo(1.0936133, 6);
		expect(level('mm')).toBe(1000);
		expect(convertSensorValue('depth_cm', 25.4, prefs({ water_level_unit: 'inch' }))).toBe(1);
	});

	it('converts EC from mS/cm (dS/m is the same number)', () => {
		expect(convertSensorValue('ec', 1.5, prefs({ ec_unit: 'us_cm' }))).toBe(1500);
		expect(convertSensorValue('ec', 1.5, prefs({ ec_unit: 'ds_cm' }))).toBe(1.5);
		expect(convertSensorValue('ec', 1.5, prefs({ ec_unit: 'ms_cm' }))).toBe(1.5);
	});

	it('converts CO₂ from ppm', () => {
		expect(convertSensorValue('co2', 400, prefs({ co2_unit: 'mg_m3' }))).toBe(720);
		expect(convertSensorValue('co2', 400, prefs({ co2_unit: 'ppm' }))).toBe(400);
	});

	it('converts pressure from hPa', () => {
		const pressure = (unit: string) =>
			convertSensorValue('pressure', 1013.25, prefs({ pressure_unit: unit }));

		expect(pressure('kpa')).toBeCloseTo(101.325, 10);
		expect(pressure('bar')).toBeCloseTo(1.01325, 10);
		expect(pressure('psi')).toBeCloseTo(14.6959488, 6);
		expect(pressure('hpa')).toBe(1013.25);
	});

	it('converts rainfall from mm', () => {
		expect(convertSensorValue('rainfall', 25.4, prefs({ rainfall_unit: 'cm' }))).toBeCloseTo(
			2.54,
			10
		);
		expect(convertSensorValue('rainfall', 25.4, prefs({ rainfall_unit: 'in' }))).toBe(1);
		expect(convertSensorValue('rainfall', 25.4, prefs({ rainfall_unit: 'mm' }))).toBe(25.4);
	});

	it('converts wind speed from m/s', () => {
		const wind = (unit: string) =>
			convertSensorValue('wind_speed', 10, prefs({ wind_speed_unit: unit }));

		expect(wind('km_h')).toBe(36);
		expect(wind('mph')).toBeCloseTo(22.369363, 6);
		expect(wind('kt')).toBeCloseTo(19.438445, 6);
		expect(wind('m_s')).toBe(10);
	});
});

describe('formatSensorMeasurement', () => {
	it('formats a reading with its unit, to two decimals for decimal sensors', () => {
		expect(formatSensorMeasurement('temperature_c', 21.456)).toEqual({
			value: 21.456,
			unit: '°C',
			valueDisplay: '21.46',
			display: '21.46 °C'
		});
		expect(formatSensorMeasurement('temperature_c', 0).display).toBe('0 °C');
		expect(formatSensorMeasurement('pressure', 1013.25).display).toBe('1,013.25 hPa');
	});

	it('rounds integer sensors to whole numbers', () => {
		expect(formatSensorMeasurement('co2', 412.6)).toEqual({
			value: 412.6,
			unit: 'ppm',
			valueDisplay: '413',
			display: '413 ppm'
		});
	});

	it('converts into the preferred unit first', () => {
		expect(
			formatSensorMeasurement('temperature_c', 20, prefs({ temperature_unit: 'fahrenheit' }))
		).toEqual({ value: 68, unit: '°F', valueDisplay: '68', display: '68 °F' });
		expect(
			formatSensorMeasurement('deapth_cm', 1234, prefs({ water_level_unit: 'cm' })).display
		).toBe('123.4 cm');
	});

	it('shows `depth_cm` like the water level, with or without a preferred unit', () => {
		expect(formatSensorMeasurement('depth_cm', 1234)).toEqual(
			formatSensorMeasurement('deapth_cm', 1234)
		);
		expect(formatSensorMeasurement('depth_cm', 1234).display).toBe('1,234 mm');
		expect(
			formatSensorMeasurement('depth_cm', 1234, prefs({ water_level_unit: 'cm' })).display
		).toBe('123.4 cm');
	});

	it('reads numeric text as a number', () => {
		expect(formatSensorMeasurement('humidity', '55.5')).toEqual({
			value: 55.5,
			unit: '%',
			valueDisplay: '55.5',
			display: '55.5 %'
		});
	});

	it('honours the fraction-digit and unit options', () => {
		expect(
			formatSensorMeasurement('temperature_c', 21.456, null, { maximumFractionDigits: 1 }).display
		).toBe('21.5 °C');
		expect(formatSensorMeasurement('co2', 412.6, null, { maximumFractionDigits: 1 }).display).toBe(
			'412.6 ppm'
		);
		expect(formatSensorMeasurement('temperature_c', 21.456, null, { withUnit: false })).toEqual({
			value: 21.456,
			unit: '°C',
			valueDisplay: '21.46',
			display: '21.46'
		});
		expect(formatSensorMeasurement('temperature_c', 21.456, null, { withUnit: true }).display).toBe(
			'21.46 °C'
		);
	});

	it('shows unitless readings without a trailing space', () => {
		expect(formatSensorMeasurement('ph', 6.789)).toEqual({
			value: 6.789,
			unit: '',
			valueDisplay: '6.79',
			display: '6.79'
		});
		expect(formatSensorMeasurement('soil_salinity', 3.14159).display).toBe('3.14');
	});

	it('shows the empty value, keeping the unit, for a missing reading', () => {
		const empty = { value: null, valueDisplay: CW_EMPTY_VALUE, display: CW_EMPTY_VALUE };

		expect(formatSensorMeasurement('temperature_c', null)).toEqual({ ...empty, unit: '°C' });
		expect(
			formatSensorMeasurement('temperature_c', undefined, prefs({ temperature_unit: 'kelvin' }))
		).toEqual({ ...empty, unit: 'K' });
	});

	it('shows a non-numeric reading as it came', () => {
		expect(formatSensorMeasurement('temperature_c', 'n/a')).toEqual({
			value: null,
			unit: '°C',
			valueDisplay: 'n/a',
			display: 'n/a'
		});
		expect(formatSensorMeasurement('humidity', Number.NaN).display).toBe('NaN');
		expect(formatSensorMeasurement('humidity', Number.POSITIVE_INFINITY).display).toBe('Infinity');
	});

	it('shows boolean sensors as the On/Off words with no unit', () => {
		expect(formatSensorMeasurement('relay_1', 'on')).toEqual({
			value: 1,
			unit: '',
			valueDisplay: m.sensor_value_on(),
			display: m.sensor_value_on()
		});
		expect(formatSensorMeasurement('smoke_detected', 0)).toEqual({
			value: 0,
			unit: '',
			valueDisplay: m.sensor_value_off(),
			display: m.sensor_value_off()
		});
		expect(
			formatSensorMeasurement('vape_detected', true, prefs(), { withUnit: true }).display
		).toBe(m.sensor_value_on());
	});

	it('shows the empty value for a boolean sensor without a reading', () => {
		const empty = { value: null, unit: '', valueDisplay: CW_EMPTY_VALUE, display: CW_EMPTY_VALUE };

		expect(formatSensorMeasurement('relay_2', null)).toEqual(empty);
		expect(formatSensorMeasurement('relay_2', undefined)).toEqual(empty);
	});
});

describe('unit option lists', () => {
	it('offers the temperature units, each with a display symbol', () => {
		const options = getTemperatureUnitOptions();

		expect(options).toEqual([
			{ label: m.unit_celsius(), value: 'celsius' },
			{ label: m.unit_fahrenheit(), value: 'fahrenheit' },
			{ label: m.unit_kelvin(), value: 'kelvin' }
		]);
		expect(
			options.map(({ value }) =>
				resolveDisplayUnit('temperature_c', prefs({ temperature_unit: value }))
			)
		).toEqual(['°C', '°F', 'K']);
	});

	it('offers the water level units, each with a display symbol', () => {
		const options = getWaterLevelUnitOptions();

		expect(options).toEqual([
			{ label: m.unit_millimeters(), value: 'mm' },
			{ label: m.unit_centimeters(), value: 'cm' },
			{ label: m.unit_inches(), value: 'inch' },
			{ label: m.unit_feet(), value: 'foot' },
			{ label: m.unit_meters(), value: 'meter' },
			{ label: m.unit_yards(), value: 'yard' }
		]);
		expect(
			options.map(({ value }) =>
				resolveDisplayUnit('deapth_cm', prefs({ water_level_unit: value }))
			)
		).toEqual(['mm', 'cm', 'in', 'ft', 'm', 'yd']);
	});

	it('offers the EC units as plain symbols', () => {
		const options = getEcUnitOptions();

		expect(options).toEqual([
			{ label: 'mS/cm', value: 'ms_cm' },
			{ label: 'dS/m', value: 'ds_cm' },
			{ label: 'µS/cm', value: 'us_cm' }
		]);
		expect(options.map(({ value }) => resolveDisplayUnit('ec', prefs({ ec_unit: value })))).toEqual(
			options.map(({ label }) => label)
		);
	});

	it('offers the rainfall units, each with a display symbol', () => {
		const options = getRainfallUnitOptions();

		expect(options).toEqual([
			{ label: m.unit_millimeters(), value: 'mm' },
			{ label: m.unit_centimeters(), value: 'cm' },
			{ label: m.unit_inches(), value: 'in' }
		]);
		expect(
			options.map(({ value }) => resolveDisplayUnit('rainfall', prefs({ rainfall_unit: value })))
		).toEqual(['mm', 'cm', 'in']);
	});

	it('offers the wind speed units, each with a display symbol', () => {
		const options = getWindSpeedUnitOptions();

		expect(options).toEqual([
			{ label: m.unit_meters_per_second(), value: 'm_s' },
			{ label: m.unit_kilometers_per_hour(), value: 'km_h' },
			{ label: m.unit_miles_per_hour(), value: 'mph' },
			{ label: m.unit_knots(), value: 'kt' }
		]);
		expect(
			options.map(({ value }) =>
				resolveDisplayUnit('wind_speed', prefs({ wind_speed_unit: value }))
			)
		).toEqual(['m/s', 'km/h', 'mph', 'kt']);
	});

	it('offers the pressure and CO₂ units as plain symbols', () => {
		const pressure = getPressureUnitOptions();
		const co2 = getCo2UnitOptions();

		expect(pressure).toEqual([
			{ label: 'hPa', value: 'hpa' },
			{ label: 'kPa', value: 'kpa' },
			{ label: 'bar', value: 'bar' },
			{ label: 'PSI', value: 'psi' }
		]);
		expect(
			pressure.map(({ value }) => resolveDisplayUnit('pressure', prefs({ pressure_unit: value })))
		).toEqual(['hPa', 'kPa', 'bar', 'psi']);
		expect(co2).toEqual([
			{ label: 'PPM', value: 'ppm' },
			{ label: 'mg/m³', value: 'mg_m3' }
		]);
		expect(co2.map(({ value }) => resolveDisplayUnit('co2', prefs({ co2_unit: value })))).toEqual([
			'ppm',
			'mg/m³'
		]);
	});

	it('offers the soil moisture units', () => {
		expect(getSoilMoistureUnitOptions()).toEqual([
			{ label: 'VWC (%)', value: 'vwc_percent' },
			{ label: m.unit_relative_saturation(), value: 'relative_percent' },
			{ label: 'kPa', value: 'kpa' },
			{ label: m.unit_centibar(), value: 'centibar' }
		]);
	});

	it('offers the weight, distance and area units', () => {
		expect(getWeightUnitOptions()).toEqual([
			{ label: m.unit_kilograms(), value: 'kg' },
			{ label: m.unit_pounds(), value: 'lb' }
		]);
		expect(getDistanceUnitOptions()).toEqual([
			{ label: m.unit_kilometers(), value: 'km' },
			{ label: m.unit_miles(), value: 'mi' }
		]);
		expect(getAreaUnitOptions()).toEqual([
			{ label: m.unit_hectares(), value: 'hectares' },
			{ label: m.unit_acres(), value: 'acres' },
			{ label: m.unit_square_meters(), value: 'square_meters' }
		]);
	});

	it('offers the date, time and decimal formats', () => {
		expect(getDateFormatOptions()).toEqual([
			{ label: 'YYYY-MM-DD', value: 'yyyy_mm_dd' },
			{ label: 'DD/MM/YYYY', value: 'dd_mm_yyyy' },
			{ label: 'MM/DD/YYYY', value: 'mm_dd_yyyy' }
		]);
		expect(getTimeFormatOptions()).toEqual([
			{ label: m.unit_time_24h(), value: '24h' },
			{ label: m.unit_time_12h(), value: '12h' }
		]);
	});

	it('offers one IANA time zone per UTC offset, labelled by a major city', () => {
		const options = getTimezoneOptions();

		expect(options).toEqual([
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
		]);
		// Every value is a zone Intl knows.
		for (const { value } of options) {
			expect(() => new Intl.DateTimeFormat('en', { timeZone: value })).not.toThrow();
		}
	});
});
