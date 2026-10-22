import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PreferencesDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { getLocale, overwriteGetLocale } from '$lib/paraglide/runtime';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	formRequest,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import {
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
	getWindSpeedUnitOptions
} from '$lib/units';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type LoadData = Exclude<Awaited<ReturnType<typeof load>>, void>;
type ActionEvent = Parameters<(typeof actions)['updatePreferences']>[0];

const originalGetLocale = getLocale;

const DEFAULTS = {
	language: 'ja',
	theme: 'system',
	temperatureUnit: 'celsius',
	weightUnit: 'kg',
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
	timeFormat: '24h'
};

const SAVED: PreferencesDto = {
	user_id: 'user-1',
	theme: 'dark',
	temperature_unit: 'fahrenheit',
	weight_unit: 'lb',
	ec_unit: 'us_cm',
	water_level_unit: 'inch',
	timezone: 'Asia/Tokyo',
	distance_unit: 'mi',
	area_unit: 'acres',
	soil_moisture_unit: 'kpa',
	pressure_unit: 'psi',
	rainfall_unit: 'in',
	wind_speed_unit: 'mph',
	co2_unit: 'mg_m3',
	date_format: 'mm_dd_yyyy',
	time_format: '12h'
};

const NOTHING_SAVED: PreferencesDto = {
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
	time_format: null
};

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: { message } });

/** Runs the load with the concrete data type (the generated type also admits `void`). */
async function run(locals: TestLocals, parent: Record<string, unknown>) {
	return (await load(testEvent<LoadEvent>({ locals, parent }))) as LoadData;
}

function save(locals: TestLocals, fields: Record<string, string> = {}) {
	return actions.updatePreferences(
		testEvent<ActionEvent>({ locals, request: formRequest(fields) })
	);
}

afterEach(() => {
	overwriteGetLocale(originalGetLocale);
	vi.restoreAllMocks();
});

describe('settings load', () => {
	it('starts from the defaults for the locale without a session, without calling the API', async () => {
		const locals = testLocals();

		const data = await run(locals, { authToken: null, session: null });

		expect(data).toMatchObject({ email: null, role: null, preferences: DEFAULTS });
		expect(locals.services.account.getPreferences).not.toHaveBeenCalled();
	});

	it('returns only the preferences the page shows and saves', async () => {
		const data = await run(testLocals(), { authToken: null });

		expect(data.preferences).toEqual(DEFAULTS);
		for (const unused of [
			'decimalSeparator',
			'compactDashboard',
			'showDerivedMetrics',
			'includeUnitsInExports',
			'highlightAlertThresholds'
		]) {
			expect(data.preferences, unused).not.toHaveProperty(unused);
		}
		expect(data.options).not.toHaveProperty('decimalSeparator');
	});

	it('picks English when the request locale is English', async () => {
		overwriteGetLocale(() => 'en');

		const data = await run(testLocals(), { authToken: null });

		expect(data.preferences.language).toBe('en');
	});

	it('shows the trimmed session email and role', async () => {
		const data = await run(testLocals(), {
			authToken: null,
			session: { email: ' ada@example.com ', role: ' authenticated ' }
		});

		expect(data).toMatchObject({ email: 'ada@example.com', role: 'authenticated' });
	});

	it('offers every unit, format and timezone option', async () => {
		const data = await run(testLocals(), { authToken: null });

		expect(data.options).toEqual({
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
			timeFormat: getTimeFormatOptions()
		});
	});

	it('seeds the form from the saved preferences', async () => {
		const locals = testLocals();
		locals.services.account.getPreferences.mockResolvedValue(SAVED);

		const data = await run(locals, { authToken: TEST_JWT });

		expect(data.preferences).toEqual({
			...DEFAULTS,
			theme: 'dark',
			temperatureUnit: 'fahrenheit',
			weightUnit: 'lb',
			ecUnit: 'us_cm',
			waterDepthUnit: 'inch',
			timezone: 'Asia/Tokyo',
			distanceUnit: 'mi',
			areaUnit: 'acres',
			soilMoistureUnit: 'kpa',
			pressureUnit: 'psi',
			rainfallUnit: 'in',
			windSpeedUnit: 'mph',
			co2Unit: 'mg_m3',
			dateFormat: 'mm_dd_yyyy',
			timeFormat: '12h'
		});
		expect(locals.services.account.getPreferences).toHaveBeenCalledTimes(1);
	});

	it('keeps the default for every preference that was never saved', async () => {
		const locals = testLocals();
		locals.services.account.getPreferences.mockResolvedValue(NOTHING_SAVED);

		await expect(run(locals, { authToken: TEST_JWT })).resolves.toMatchObject({
			preferences: DEFAULTS
		});
	});

	it('falls back to the defaults when the preferences cannot be loaded', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = apiError(404, 'Not found');
		const locals = testLocals();
		locals.services.account.getPreferences.mockRejectedValue(failure);

		await expect(run(locals, { authToken: TEST_JWT })).resolves.toMatchObject({
			preferences: DEFAULTS
		});
		expect(consoleError).toHaveBeenCalledWith('Failed to load preferences:', failure);
	});
});

describe('updatePreferences action', () => {
	const fields = {
		theme: 'light',
		temperatureUnit: ' kelvin ',
		weightUnit: 'kg',
		ecUnit: 'ds_cm',
		waterDepthUnit: 'cm',
		timezone: 'Europe/London',
		distanceUnit: 'km',
		areaUnit: 'square_meters',
		soilMoistureUnit: 'centibar',
		pressureUnit: 'bar',
		rainfallUnit: 'cm',
		windSpeedUnit: 'kt',
		co2Unit: 'ppm',
		dateFormat: 'dd_mm_yyyy',
		timeFormat: '24h'
	};

	it('saves every field under its API name, trimmed', async () => {
		const locals = testLocals();
		locals.services.account.updatePreferences.mockResolvedValue(SAVED);

		await expect(save(locals, fields)).resolves.toEqual({ success: true });
		expect(locals.services.account.updatePreferences).toHaveBeenCalledWith({
			theme: 'light',
			temperature_unit: 'kelvin',
			weight_unit: 'kg',
			ec_unit: 'ds_cm',
			water_level_unit: 'cm',
			timezone: 'Europe/London',
			distance_unit: 'km',
			area_unit: 'square_meters',
			soil_moisture_unit: 'centibar',
			pressure_unit: 'bar',
			rainfall_unit: 'cm',
			wind_speed_unit: 'kt',
			co2_unit: 'ppm',
			date_format: 'dd_mm_yyyy',
			time_format: '24h'
		});
	});

	it('sends null for empty or missing fields', async () => {
		const locals = testLocals();
		locals.services.account.updatePreferences.mockResolvedValue(NOTHING_SAVED);

		await expect(save(locals, { theme: '  ', timezone: '' })).resolves.toEqual({ success: true });
		expect(locals.services.account.updatePreferences).toHaveBeenCalledWith({
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
			time_format: null
		});
	});

	it('requires a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(save(locals, fields)).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
		expect(locals.services.account.updatePreferences).not.toHaveBeenCalled();
	});

	it("returns the API's status and message, or 500 for other failures", async () => {
		const refused = testLocals();
		refused.services.account.updatePreferences.mockRejectedValue(
			apiError(400, 'theme must be one of dark, light, system')
		);
		await expect(save(refused, fields)).resolves.toMatchObject({
			status: 400,
			data: { error: 'theme must be one of dark, light, system' }
		});

		const offline = testLocals();
		offline.services.account.updatePreferences.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(save(offline, fields)).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});

		const unknown = testLocals();
		unknown.services.account.updatePreferences.mockRejectedValue({});
		await expect(save(unknown, fields)).resolves.toMatchObject({
			status: 500,
			data: { error: m.generic_error() }
		});
	});

	it('sends the same authenticated GET and PATCH requests as before', async () => {
		const fake = createFakeFetch(() => jsonResponse(SAVED));
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...testLocals(), services } as unknown as TestLocals;

		await run(locals, { authToken: TEST_JWT });
		await save(locals, { theme: 'dark' });

		expect(fake.requests.map(({ method, path }) => `${method} ${path}`)).toEqual([
			'GET /auth/preferences',
			'PATCH /auth/preferences'
		]);
		expect(fake.requests[1].body).toMatchObject({ theme: 'dark', time_format: null });
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});
