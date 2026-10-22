import { formatCwNumber } from '@cropwatchdevelopment/cwui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, type RecordedRequest } from '$lib/testing/http';
import { describeWeatherCode, fetchWeatherByRange, weatherEmoji } from './traffic-weather';

const FIELDS =
	'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max';
const local = (day: number) => new Date(2026, 9, day, 12);

/** Open-Meteo's daily answer for the given days. */
function dailyPayload(days: string[], overrides: Record<string, unknown[]> = {}) {
	return {
		daily: {
			time: days,
			weather_code: days.map(() => 61),
			temperature_2m_max: days.map(() => 18.4),
			temperature_2m_min: days.map(() => 9.6),
			precipitation_sum: days.map(() => 3.25),
			wind_speed_10m_max: days.map(() => 14.4),
			...overrides
		}
	};
}

/** The days a request asked for, so the fake can answer with exactly those. */
function requestedDays(request: RecordedRequest): string[] {
	const url = new URL(request.url);
	const days: string[] = [];
	const cursor = new Date(`${url.searchParams.get('start_date')}T12:00:00`);
	const end = new Date(`${url.searchParams.get('end_date')}T12:00:00`);
	while (cursor <= end) {
		days.push(
			`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
		);
		cursor.setDate(cursor.getDate() + 1);
	}
	return days;
}

let fake: ReturnType<typeof createFakeFetch>;
// The module caches per coordinates + range for the session: every test uses
// its own coordinates.
let latitude = 30;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(local(21));
	latitude += 1;
	fake = createFakeFetch((request) => jsonResponse(dailyPayload(requestedDays(request))));
	vi.stubGlobal('fetch', fake.fetch);
});

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

const requested = () =>
	fake.requests.map((request) => {
		const url = new URL(request.url);
		return {
			api: `${url.origin}${url.pathname}`,
			...Object.fromEntries(url.searchParams)
		};
	});

describe('fetchWeatherByRange', () => {
	it("asks Open-Meteo's archive for past days", async () => {
		const weather = await fetchWeatherByRange(local(1), local(3), latitude, 139.6917);

		expect(requested()).toEqual([
			{
				api: 'https://archive-api.open-meteo.com/v1/archive',
				latitude: String(latitude),
				longitude: '139.6917',
				daily: FIELDS,
				timezone: 'auto',
				start_date: '2026-10-01',
				end_date: '2026-10-03'
			}
		]);
		expect(Object.keys(weather)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03']);
	});

	it('asks the forecast for today and later', async () => {
		await fetchWeatherByRange(local(21), local(23), latitude, 139.6917);

		expect(requested()).toEqual([
			expect.objectContaining({
				api: 'https://api.open-meteo.com/v1/forecast',
				start_date: '2026-10-21',
				end_date: '2026-10-23'
			})
		]);
	});

	it('splits a range around today between the archive and the forecast', async () => {
		const weather = await fetchWeatherByRange(local(19), local(22), latitude, 139.6917);

		expect(requested()).toEqual([
			expect.objectContaining({
				api: 'https://archive-api.open-meteo.com/v1/archive',
				start_date: '2026-10-19',
				end_date: '2026-10-20'
			}),
			expect.objectContaining({
				api: 'https://api.open-meteo.com/v1/forecast',
				start_date: '2026-10-21',
				end_date: '2026-10-22'
			})
		]);
		expect(Object.keys(weather).sort()).toEqual([
			'2026-10-19',
			'2026-10-20',
			'2026-10-21',
			'2026-10-22'
		]);
	});

	it('summarises each day', async () => {
		const weather = await fetchWeatherByRange(local(21), local(21), latitude, 139.6917);

		expect(weather['2026-10-21']).toEqual({
			dayKey: '2026-10-21',
			summary: [
				m.weather_rain(),
				`${formatCwNumber(18.4, { decimals: 0 })}° / ${formatCwNumber(9.6, { decimals: 0 })}°C`,
				m.traffic_precip_summary({ value: '3.3' }),
				m.traffic_wind_summary({ value: '14' })
			].join(' • '),
			label: m.weather_rain(),
			tone: 'info',
			temperatureLabel: `${formatCwNumber(18.4, { decimals: 0 })}° / ${formatCwNumber(9.6, { decimals: 0 })}°C`,
			temperatureHighC: 18.4,
			temperatureLowC: 9.6,
			precipitationMm: 3.25,
			windSpeedKmh: 14.4,
			weatherCode: 61
		});
	});

	it('leaves out what Open-Meteo did not report', async () => {
		fake = createFakeFetch((request) =>
			jsonResponse(
				request.url.includes('archive')
					? { daily: { time: ['2026-10-20'] } }
					: {
							daily: {
								time: ['2026-10-21', '2026-10-22', 7, '   '],
								weather_code: 'n/a',
								temperature_2m_max: [null, 20],
								temperature_2m_min: [null, null]
							}
						}
			)
		);
		vi.stubGlobal('fetch', fake.fetch);

		const weather = await fetchWeatherByRange(local(20), local(22), latitude, 139.6917);

		expect(Object.keys(weather)).toEqual(['2026-10-20', '2026-10-21', '2026-10-22']);
		expect(weather['2026-10-20']).toEqual(
			expect.objectContaining({ temperatureLabel: null, weatherCode: null, windSpeedKmh: null })
		);
		expect(weather['2026-10-21']).toMatchObject({
			summary: m.traffic_weather_unavailable(),
			label: m.common_weather(),
			tone: 'secondary',
			temperatureLabel: null,
			temperatureHighC: null,
			temperatureLowC: null,
			precipitationMm: null,
			windSpeedKmh: null,
			weatherCode: null
		});
		// One temperature is enough for a label; the missing one shows as a dash.
		expect(weather['2026-10-22'].temperatureLabel).toBe(
			`${formatCwNumber(20, { decimals: 0 })}° / ${formatCwNumber(null, { decimals: 0 })}°C`
		);
	});

	it('returns no days for an answer without daily data', async () => {
		for (const payload of [null, 'oops', { daily: null }, { daily: { time: 'today' } }]) {
			fake = createFakeFetch(() => jsonResponse(payload));
			vi.stubGlobal('fetch', fake.fetch);
			latitude += 0.5;

			expect(await fetchWeatherByRange(local(21), local(21), latitude, 139.6917)).toEqual({});
		}
	});

	it('answers a repeated range from its cache, also for coordinates equal to 4 decimals', async () => {
		const first = await fetchWeatherByRange(local(1), local(2), latitude, 139.6917);
		const again = await fetchWeatherByRange(local(1), local(2), latitude + 0.00001, 139.69174);

		expect(again).toBe(first);
		expect(fake.requests).toHaveLength(1);
	});

	it('asks once for a range asked for again while its answer is on the way', async () => {
		const first = fetchWeatherByRange(local(1), local(2), latitude, 139.6917);
		const again = fetchWeatherByRange(local(1), local(2), latitude, 139.6917);

		expect(await again).toBe(await first);
		expect(fake.requests).toHaveLength(1);
	});

	it('asks for nothing when the range ends before it starts', async () => {
		expect(await fetchWeatherByRange(local(5), local(3), latitude, 139.6917)).toEqual({});
		expect(fake.requests).toHaveLength(0);
	});

	it('fails when Open-Meteo refuses, and does not cache the failure', async () => {
		fake = createFakeFetch(() => jsonResponse({ reason: 'busy' }, { status: 503 }));
		vi.stubGlobal('fetch', fake.fetch);

		// Everyone waiting for that answer gets the failure.
		const first = fetchWeatherByRange(local(1), local(2), latitude, 139.6917);
		const again = fetchWeatherByRange(local(1), local(2), latitude, 139.6917);
		await expect(first).rejects.toThrow('Weather request failed with 503');
		await expect(again).rejects.toThrow('Weather request failed with 503');
		expect(fake.requests).toHaveLength(1);

		fake = createFakeFetch((request) => jsonResponse(dailyPayload(requestedDays(request))));
		vi.stubGlobal('fetch', fake.fetch);
		await expect(
			fetchWeatherByRange(local(1), local(2), latitude, 139.6917)
		).resolves.toHaveProperty('2026-10-01');
		expect(fake.requests).toHaveLength(1);
	});
});

describe('weather codes', () => {
	const CODES: Array<
		[number | null, string, { label: string; description: string; tone: string }]
	> = [
		[0, '☀️', { label: m.weather_clear(), description: m.weather_clear_sky(), tone: 'success' }],
		[
			1,
			'☀️',
			{
				label: m.weather_mostly_clear(),
				description: m.weather_mostly_clear_description(),
				tone: 'success'
			}
		],
		[
			2,
			'🌤️',
			{
				label: m.weather_partly_cloudy(),
				description: m.weather_partly_cloudy_description(),
				tone: 'info'
			}
		],
		[3, '☁️', { label: m.weather_cloudy(), description: m.weather_overcast(), tone: 'secondary' }],
		[45, '🌫️', { label: m.weather_fog(), description: m.weather_foggy(), tone: 'secondary' }],
		[48, '🌫️', { label: m.weather_fog(), description: m.weather_foggy(), tone: 'secondary' }],
		[55, '🌦️', { label: m.weather_drizzle(), description: m.weather_drizzle(), tone: 'info' }],
		[82, '🌧️', { label: m.weather_rain(), description: m.weather_rain(), tone: 'info' }],
		[75, '❄️', { label: m.weather_snow(), description: m.weather_snow(), tone: 'secondary' }],
		[96, '⛈️', { label: m.weather_storm(), description: m.weather_thunderstorm(), tone: 'danger' }],
		[
			42,
			'🌡️',
			{
				label: m.common_weather(),
				description: m.traffic_weather_unavailable(),
				tone: 'secondary'
			}
		],
		[
			null,
			'🌡️',
			{
				label: m.common_weather(),
				description: m.traffic_weather_unavailable(),
				tone: 'secondary'
			}
		]
	];

	it('maps each WMO code to an emoji and a description', () => {
		for (const [code, emoji, description] of CODES) {
			expect(weatherEmoji(code)).toBe(emoji);
			expect(describeWeatherCode(code)).toEqual(description);
		}
	});
});
