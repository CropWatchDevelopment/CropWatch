import { fail } from '@sveltejs/kit';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type { UpdatePreferencesRequest } from '$lib/api/api.dtos';
import { readApiErrorMessage } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime';
import {
	getTemperatureUnitOptions,
	getWeightUnitOptions,
	getEcUnitOptions,
	getWaterLevelUnitOptions,
	getTimezoneOptions,
	getSoilMoistureUnitOptions,
	getRainfallUnitOptions,
	getWindSpeedUnitOptions,
	getPressureUnitOptions,
	getCo2UnitOptions,
	getDistanceUnitOptions,
	getAreaUnitOptions,
	getDateFormatOptions,
	getTimeFormatOptions,
	getDecimalSeparatorOptions
} from '$lib/units';
import type { Actions, PageServerLoad } from './$types';

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

const readString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const createDefaultPreferences = (locale: string): PreferenceDraft => ({
	language: locale.startsWith('en') ? 'en' : 'ja',
	theme: 'system',
	temperatureUnit: 'celsius',
	weightUnit: 'kg',
	// Defaults match the canonical raw units (mS/cm, mm) so saving the defaults
	// does not silently rescale existing displays.
	ecUnit: 'ms_cm',
	waterDepthUnit: 'mm',
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
			temperature: getTemperatureUnitOptions(),
			weight: getWeightUnitOptions(),
			ec: getEcUnitOptions(),
			waterDepth: getWaterLevelUnitOptions(),
			timezone: getTimezoneOptions(),
			soilMoisture: getSoilMoistureUnitOptions(),
			rainfall: getRainfallUnitOptions(),
			windSpeed: getWindSpeedUnitOptions(),
			pressure: getPressureUnitOptions(),
			co2: getCo2UnitOptions(),
			distance: getDistanceUnitOptions(),
			area: getAreaUnitOptions(),
			dateFormat: getDateFormatOptions(),
			timeFormat: getTimeFormatOptions(),
			decimalSeparator: getDecimalSeparatorOptions()
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
