import { fail } from '@sveltejs/kit';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type { UpdatePreferencesRequest } from '$lib/api/api.dtos';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';

type Option = {
	label: string;
	value: string;
};

type SupportedLocale = 'ja' | 'en';

type PreferenceDraft = {
	language: SupportedLocale;
	theme: 'dark' | 'light' | 'system';
	temperatureUnit: string;
	weightUnit: string;
	ecUnit: string;
	waterDepthUnit: string;
	timezone: string;
	soilMoistureUnit: string;
	rainfallUnit: string;
	windSpeedUnit: string;
	pressureUnit: string;
	co2Unit: string;
	distanceUnit: string;
	areaUnit: string;
	dateFormat: string;
	timeFormat: string;
	decimalSeparator: string;
	compactDashboard: boolean;
	showDerivedMetrics: boolean;
	includeUnitsInExports: boolean;
	highlightAlertThresholds: boolean;
};

const languageOptions: Option[] = [
	{ label: 'Japanese', value: 'ja' },
	{ label: 'English', value: 'en' }
];

// Persisted (profile_preferences) — value sets must match the DB CHECK constraints.
const temperatureUnitOptions: Option[] = [
	{ label: 'Celsius (°C)', value: 'celsius' },
	{ label: 'Fahrenheit (°F)', value: 'fahrenheit' },
	{ label: 'Kelvin (K)', value: 'kelvin' }
];

const weightUnitOptions: Option[] = [
	{ label: 'Kilograms (kg)', value: 'kg' },
	{ label: 'Pounds (lb)', value: 'lb' }
];

const ecUnitOptions: Option[] = [
	{ label: 'mS/cm', value: 'ms_cm' },
	{ label: 'dS/cm', value: 'ds_cm' },
	{ label: 'µS/cm', value: 'us_cm' }
];

const waterLevelUnitOptions: Option[] = [
	{ label: 'Millimeters (mm)', value: 'mm' },
	{ label: 'Centimeters (cm)', value: 'cm' },
	{ label: 'Inches (in)', value: 'inch' },
	{ label: 'Feet (ft)', value: 'foot' },
	{ label: 'Meters (m)', value: 'meter' },
	{ label: 'Yards (yd)', value: 'yard' }
];

// One representative major city per UTC offset (value is the IANA zone).
const timezoneOptions: Option[] = [
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

// Not yet persisted — displayed disabled until backing columns/consumers exist.
const soilMoistureUnitOptions: Option[] = [
	{ label: 'VWC (%)', value: 'vwc_percent' },
	{ label: 'Relative saturation (%)', value: 'relative_percent' },
	{ label: 'kPa', value: 'kpa' },
	{ label: 'centibar', value: 'centibar' }
];

const rainfallUnitOptions: Option[] = [
	{ label: 'Millimeters (mm)', value: 'mm' },
	{ label: 'Centimeters (cm)', value: 'cm' },
	{ label: 'Inches (in)', value: 'in' }
];

const windSpeedUnitOptions: Option[] = [
	{ label: 'Meters per second (m/s)', value: 'm_s' },
	{ label: 'Kilometers per hour (km/h)', value: 'km_h' },
	{ label: 'Miles per hour (mph)', value: 'mph' },
	{ label: 'Knots (kt)', value: 'kt' }
];

const pressureUnitOptions: Option[] = [
	{ label: 'hPa', value: 'hpa' },
	{ label: 'kPa', value: 'kpa' },
	{ label: 'bar', value: 'bar' },
	{ label: 'PSI', value: 'psi' }
];

const co2UnitOptions: Option[] = [
	{ label: 'PPM', value: 'ppm' },
	{ label: 'mg/m3', value: 'mg_m3' }
];

const distanceUnitOptions: Option[] = [
	{ label: 'Kilometers (km)', value: 'km' },
	{ label: 'Miles (mi)', value: 'mi' }
];

const areaUnitOptions: Option[] = [
	{ label: 'Hectares (ha)', value: 'hectares' },
	{ label: 'Acres (ac)', value: 'acres' },
	{ label: 'Square meters (m2)', value: 'square_meters' }
];

const dateFormatOptions: Option[] = [
	{ label: 'YYYY-MM-DD', value: 'yyyy_mm_dd' },
	{ label: 'DD/MM/YYYY', value: 'dd_mm_yyyy' },
	{ label: 'MM/DD/YYYY', value: 'mm_dd_yyyy' }
];

const timeFormatOptions: Option[] = [
	{ label: '24-hour', value: '24h' },
	{ label: '12-hour', value: '12h' }
];

const decimalSeparatorOptions: Option[] = [
	{ label: 'Dot (1,234.56)', value: 'dot' },
	{ label: 'Comma (1.234,56)', value: 'comma' }
];

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const createDefaultPreferences = (locale: string): PreferenceDraft => ({
	language: locale.startsWith('en') ? 'en' : 'ja',
	theme: 'system',
	temperatureUnit: 'celsius',
	weightUnit: 'kg',
	ecUnit: 'us_cm',
	waterDepthUnit: 'cm',
	timezone: '',
	soilMoistureUnit: 'vwc_percent',
	rainfallUnit: 'mm',
	windSpeedUnit: 'm_s',
	pressureUnit: 'hpa',
	co2Unit: 'ppm',
	distanceUnit: 'km',
	areaUnit: 'hectares',
	dateFormat: 'yyyy_mm_dd',
	timeFormat: '24h',
	decimalSeparator: 'dot',
	compactDashboard: false,
	showDerivedMetrics: true,
	includeUnitsInExports: true,
	highlightAlertThresholds: true
});

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { authToken, session } = await parent();
	const locale = getLocale();
	const defaults = createDefaultPreferences(locale);

	let preferences = defaults;
	if (authToken) {
		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const prefs = await api.getPreferences();
			preferences = {
				...defaults,
				theme: (prefs.theme as PreferenceDraft['theme']) ?? defaults.theme,
				temperatureUnit: prefs.temperature_unit ?? defaults.temperatureUnit,
				weightUnit: prefs.weight_unit ?? defaults.weightUnit,
				ecUnit: prefs.ec_unit ?? defaults.ecUnit,
				waterDepthUnit: prefs.water_level_unit ?? defaults.waterDepthUnit,
				timezone: prefs.timezone ?? defaults.timezone,
				distanceUnit: prefs.distance_unit ?? defaults.distanceUnit,
				areaUnit: prefs.area_unit ?? defaults.areaUnit,
				soilMoistureUnit: prefs.soil_moisture_unit ?? defaults.soilMoistureUnit,
				pressureUnit: prefs.pressure_unit ?? defaults.pressureUnit,
				rainfallUnit: prefs.rainfall_unit ?? defaults.rainfallUnit,
				windSpeedUnit: prefs.wind_speed_unit ?? defaults.windSpeedUnit,
				co2Unit: prefs.co2_unit ?? defaults.co2Unit,
				dateFormat: prefs.date_format ?? defaults.dateFormat,
				timeFormat: prefs.time_format ?? defaults.timeFormat
			};
		} catch (error) {
			// Falls back to defaults when the preferences table/endpoint is unavailable
			// (e.g. before the 014 migration is applied).
			console.error('Failed to load preferences:', error);
		}
	}

	return {
		email: readString(session?.email) || null,
		role: readString(session?.role) || null,
		preferences,
		options: {
			language: languageOptions,
			temperature: temperatureUnitOptions,
			weight: weightUnitOptions,
			ec: ecUnitOptions,
			waterDepth: waterLevelUnitOptions,
			timezone: timezoneOptions,
			soilMoisture: soilMoistureUnitOptions,
			rainfall: rainfallUnitOptions,
			windSpeed: windSpeedUnitOptions,
			pressure: pressureUnitOptions,
			co2: co2UnitOptions,
			distance: distanceUnitOptions,
			area: areaUnitOptions,
			dateFormat: dateFormatOptions,
			timeFormat: timeFormatOptions,
			decimalSeparator: decimalSeparatorOptions
		}
	};
};

export const actions: Actions = {
	updatePreferences: async ({ request, locals, fetch }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

		const formData = await request.formData();
		// The form only yields strings; the API validates them (@IsIn), so narrow
		// to the request type at this boundary.
		const payload = {
			theme: readString(formData.get('theme')) || null,
			temperature_unit: readString(formData.get('temperatureUnit')) || null,
			weight_unit: readString(formData.get('weightUnit')) || null,
			ec_unit: readString(formData.get('ecUnit')) || null,
			water_level_unit: readString(formData.get('waterDepthUnit')) || null,
			timezone: readString(formData.get('timezone')) || null,
			distance_unit: readString(formData.get('distanceUnit')) || null,
			area_unit: readString(formData.get('areaUnit')) || null,
			soil_moisture_unit: readString(formData.get('soilMoistureUnit')) || null,
			pressure_unit: readString(formData.get('pressureUnit')) || null,
			rainfall_unit: readString(formData.get('rainfallUnit')) || null,
			wind_speed_unit: readString(formData.get('windSpeedUnit')) || null,
			co2_unit: readString(formData.get('co2Unit')) || null,
			date_format: readString(formData.get('dateFormat')) || null,
			time_format: readString(formData.get('timeFormat')) || null
		} as UpdatePreferencesRequest;

		const api = new ApiService({ fetchFn: fetch, authToken });
		try {
			await api.updatePreferences(payload);
			return { success: true };
		} catch (err) {
			const errorPayload = err instanceof ApiServiceError ? err.payload : err;
			const status = err instanceof ApiServiceError ? err.status : 500;
			return fail(status, { error: readApiErrorMessage(errorPayload, m.generic_error()) });
		}
	}
};
