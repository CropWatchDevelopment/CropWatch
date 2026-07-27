/**
 * Client-side daily weather for the traffic display, fetched directly from
 * Open-Meteo (forecast API for today/future days, archive API for the past)
 * and cached per coordinates + day range.
 */
import type { CwTone } from '@cropwatchdevelopment/cwui';
import { SvelteMap } from 'svelte/reactivity';
import { m } from '$lib/paraglide/messages.js';
import { isRecord, readNumber, readString, shiftDayKey, toDayKey } from './traffic-data';

export interface WeatherDaySummary {
	dayKey: string;
	summary: string;
	label: string;
	tone: CwTone;
	temperatureLabel: string | null;
	temperatureHighC: number | null;
	temperatureLowC: number | null;
	precipitationMm: number | null;
	windSpeedKmh: number | null;
	weatherCode: number | null;
}

const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_DAILY_FIELDS =
	'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max';

export function weatherEmoji(code: number | null): string {
	if (code === 0 || code === 1) return '☀️';
	if (code === 2) return '🌤️';
	if (code === 3) return '☁️';
	if (code === 45 || code === 48) return '🌫️';
	if ([51, 53, 55, 56, 57].includes(code ?? -1)) return '🌦️';
	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return '🌧️';
	if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return '❄️';
	if ([95, 96, 99].includes(code ?? -1)) return '⛈️';
	return '🌡️';
}

export function describeWeatherCode(code: number | null): {
	label: string;
	description: string;
	tone: CwTone;
} {
	if (code === 0) {
		return { label: m.weather_clear(), description: m.weather_clear_sky(), tone: 'success' };
	}

	if (code === 1) {
		return {
			label: m.weather_mostly_clear(),
			description: m.weather_mostly_clear_description(),
			tone: 'success'
		};
	}

	if (code === 2) {
		return {
			label: m.weather_partly_cloudy(),
			description: m.weather_partly_cloudy_description(),
			tone: 'info'
		};
	}

	if (code === 3) {
		return { label: m.weather_cloudy(), description: m.weather_overcast(), tone: 'secondary' };
	}

	if (code === 45 || code === 48) {
		return { label: m.weather_fog(), description: m.weather_foggy(), tone: 'secondary' };
	}

	if ([51, 53, 55, 56, 57].includes(code ?? -1)) {
		return { label: m.weather_drizzle(), description: m.weather_drizzle(), tone: 'info' };
	}

	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) {
		return { label: m.weather_rain(), description: m.weather_rain(), tone: 'info' };
	}

	if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) {
		return { label: m.weather_snow(), description: m.weather_snow(), tone: 'secondary' };
	}

	if ([95, 96, 99].includes(code ?? -1)) {
		return {
			label: m.weather_storm(),
			description: m.weather_thunderstorm(),
			tone: 'danger'
		};
	}

	return {
		label: m.common_weather(),
		description: m.traffic_weather_unavailable(),
		tone: 'secondary'
	};
}

function buildWeatherDaySummary(
	dayKey: string,
	weatherCode: number | null,
	temperatureHighC: number | null,
	temperatureLowC: number | null,
	precipitationMm: number | null,
	windSpeedKmh: number | null
): WeatherDaySummary {
	const descriptor = describeWeatherCode(weatherCode);
	const temperatureLabel =
		temperatureHighC !== null || temperatureLowC !== null
			? `${temperatureHighC !== null ? temperatureHighC.toFixed(0) : '--'}° / ${temperatureLowC !== null ? temperatureLowC.toFixed(0) : '--'}°C`
			: null;

	const summaryParts = [descriptor.description];
	if (temperatureLabel) {
		summaryParts.push(temperatureLabel);
	}

	if (precipitationMm !== null) {
		summaryParts.push(m.traffic_precip_summary({ value: precipitationMm.toFixed(1) }));
	}

	if (windSpeedKmh !== null) {
		summaryParts.push(m.traffic_wind_summary({ value: windSpeedKmh.toFixed(0) }));
	}

	return {
		dayKey,
		summary: summaryParts.join(' • '),
		label: descriptor.label,
		tone: descriptor.tone,
		temperatureLabel,
		temperatureHighC,
		temperatureLowC,
		precipitationMm,
		windSpeedKmh,
		weatherCode
	};
}

function normalizeWeatherPayload(payload: unknown): Record<string, WeatherDaySummary> {
	if (!isRecord(payload) || !isRecord(payload.daily) || !Array.isArray(payload.daily.time)) {
		return {};
	}

	const daily = payload.daily as Record<string, unknown> & { time: unknown[] };
	const result: Record<string, WeatherDaySummary> = {};

	for (const [index, rawDayKey] of daily.time.entries()) {
		const dayKey = readString(rawDayKey);
		if (!dayKey) continue;

		result[dayKey] = buildWeatherDaySummary(
			dayKey,
			readNumber(Array.isArray(daily.weather_code) ? daily.weather_code[index] : null),
			readNumber(Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[index] : null),
			readNumber(Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[index] : null),
			readNumber(Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum[index] : null),
			readNumber(Array.isArray(daily.wind_speed_10m_max) ? daily.wind_speed_10m_max[index] : null)
		);
	}

	return result;
}

const weatherCache = new SvelteMap<string, Record<string, WeatherDaySummary>>();

export async function fetchWeatherByRange(
	startDate: Date,
	endDate: Date,
	latitude: number,
	longitude: number
): Promise<Record<string, WeatherDaySummary>> {
	const startDay = toDayKey(startDate);
	const endDay = toDayKey(endDate);
	const cacheKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${startDay}:${endDay}`;
	const cached = weatherCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const todayKey = toDayKey(new Date());
	const requests: Promise<Record<string, WeatherDaySummary>>[] = [];
	const addRequest = (baseUrl: string, requestStart: string, requestEnd: string) => {
		if (requestStart > requestEnd) return;

		const url = new URL(baseUrl);
		url.searchParams.set('latitude', String(latitude));
		url.searchParams.set('longitude', String(longitude));
		url.searchParams.set('daily', OPEN_METEO_DAILY_FIELDS);
		url.searchParams.set('timezone', 'auto');
		url.searchParams.set('start_date', requestStart);
		url.searchParams.set('end_date', requestEnd);

		requests.push(
			fetch(url.toString()).then(async (response) => {
				if (!response.ok) {
					throw new Error(`Weather request failed with ${response.status}`);
				}

				return normalizeWeatherPayload(await response.json());
			})
		);
	};

	if (endDay < todayKey) {
		addRequest(OPEN_METEO_ARCHIVE_URL, startDay, endDay);
	} else if (startDay >= todayKey) {
		addRequest(OPEN_METEO_FORECAST_URL, startDay, endDay);
	} else {
		addRequest(OPEN_METEO_ARCHIVE_URL, startDay, shiftDayKey(todayKey, -1));
		addRequest(OPEN_METEO_FORECAST_URL, todayKey, endDay);
	}

	const merged: Record<string, WeatherDaySummary> = {};
	for (const weatherResult of await Promise.all(requests)) {
		Object.assign(merged, weatherResult);
	}

	weatherCache.set(cacheKey, merged);
	return merged;
}
