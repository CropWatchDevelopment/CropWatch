import { formatCwMeasurement } from '@cropwatchdevelopment/cwui';
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrafficDataPoint } from '$lib/api/api.dtos';
import { formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { createClientServices } from '$lib/services/client';
import {
	createFakeFetch,
	jsonResponse,
	testPublicConfig,
	type RecordedRequest
} from '$lib/testing/http';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { formatMeasurement, getMonthBounds, metricLabel } from './traffic-data';
import TrafficCalendarCard from './TrafficCalendarCard.svelte';

const local = (day: number, hour = 0, minute = 0, month = 9) =>
	new Date(2026, month, day, hour, minute);
const iso = (day: number, hour = 0, minute = 0) => local(day, hour, minute).toISOString();

/** Hourly accumulator rows: two hours on the 20th, one on the 21st. */
const TRAFFIC = [
	{ id: 1, created_at: iso(20, 9, 5), traffic_hour: iso(20, 9), car_count: 4, people_count: 1 },
	{ id: 2, created_at: iso(20, 10, 5), traffic_hour: iso(20, 10), car_count: 2, people_count: 0 },
	{ id: 3, created_at: iso(21, 8, 5), traffic_hour: iso(21, 8), car_count: 7, people_count: 3 }
] as unknown as TrafficDataPoint[];

const daily = (time: string[], code: number, high: number, low: number, rain: number) => ({
	daily: {
		time,
		weather_code: time.map(() => code),
		temperature_2m_max: time.map(() => high),
		temperature_2m_min: time.map(() => low),
		precipitation_sum: time.map(() => rain),
		wind_speed_10m_max: time.map(() => 10)
	}
});

/** Open-Meteo: rain on the 20th (archive), clear on the 21st and cloudy on the 22nd (forecast). */
function weatherResponder(request: RecordedRequest) {
	return request.url.startsWith('https://archive-api.open-meteo.com/')
		? jsonResponse(daily(['2026-10-20'], 61, 18.4, 9.6, 3.25))
		: jsonResponse({
				daily: {
					...daily(['2026-10-21'], 0, 22, 12, 0).daily,
					time: ['2026-10-21', '2026-10-22'],
					weather_code: [0, 3]
				}
			});
}

interface Props {
	devEui: string;
	latitude: number | null;
	longitude: number | null;
	anchorDate: Date | null;
	locationLabel: string;
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
let fake: ReturnType<typeof createFakeFetch>;
// The weather module caches per coordinates for the session: one per test.
let latitude = 20;

function cardProps(overrides: Partial<Props> = {}): Props {
	return {
		devEui: 'CAM-1',
		latitude,
		longitude: 139.6917,
		anchorDate: local(21, 9),
		locationLabel: `${latitude.toFixed(4)}, 139.6917`,
		...overrides
	};
}

function render(
	props: Partial<Props> | Props = {},
	options: { accessToken?: string | null; services?: ReturnType<typeof createClientServices> } = {}
) {
	view = renderWithServices(TrafficCalendarCard, {
		props: 'locationLabel' in props && 'anchorDate' in props ? (props as Props) : cardProps(props),
		services: options.services ?? services,
		app: {
			accessToken: options.accessToken === null ? undefined : (options.accessToken ?? 'jwt-token')
		}
	});
	return view;
}

const getTraffic = () => services.telemetry.getTrafficData;
const monthQuery = (year: number, month: number) => {
	const { start, end } = getMonthBounds(year, month);
	return { start: start.toISOString(), end: end.toISOString() };
};
const chips = () =>
	[...document.querySelectorAll('.traffic-calendar__meta .cw-chip')].map((chip) => ({
		label: chip.textContent?.trim(),
		tone: [...chip.classList].find((name) =>
			/^cw-chip--(info|secondary|warning|danger)$/.test(name)
		)
	}));
const chipLabels = () => chips().map((chip) => chip.label);
/** The calendar cell of a day of October 2026. */
const dayCell = (day: number) =>
	document.querySelector(`[data-day-key="2026-10-${day}"]`)?.closest('.cw-calendar__day') ?? null;
const cellText = (day: number) =>
	(dayCell(day)?.querySelector('.cw-calendar__day-body')?.textContent ?? '')
		.replace(/\s+/g, ' ')
		.trim();
const previousMonthButton = () =>
	document.querySelector<HTMLButtonElement>(
		`.cw-calendar__nav-btn[aria-label="${m.cwui_cal_previous_month()}"]`
	)!;
const nextMonthButton = () =>
	document.querySelector<HTMLButtonElement>(
		`.cw-calendar__nav-btn[aria-label="${m.cwui_cal_next_month()}"]`
	)!;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(local(21, 12));
	latitude += 1;
	services = createMockServices();
	fake = createFakeFetch(weatherResponder);
	vi.stubGlobal('fetch', fake.fetch);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('TrafficCalendarCard', () => {
	it("loads the anchor month's traffic and weather and shows them per day", async () => {
		getTraffic().mockResolvedValue(TRAFFIC);
		render();

		expect(getTraffic()).toHaveBeenCalledTimes(1);
		expect(getTraffic()).toHaveBeenCalledWith('CAM-1', monthQuery(2026, 9));
		await vi.waitFor(() =>
			expect(chipLabels()).toContain(m.traffic_month_traffic_days({ count: formatNumber(2) }))
		);
		expect(chips()).toEqual([
			{ label: m.traffic_month_traffic_days({ count: formatNumber(2) }), tone: 'cw-chip--info' },
			{
				label: m.traffic_lat_lng_label({ label: `${latitude.toFixed(4)}, 139.6917` }),
				tone: 'cw-chip--secondary'
			}
		]);
		expect(document.body.textContent).toContain(m.traffic_daily_traffic_weather());
		expect(document.body.textContent).toContain(
			m.traffic_calendar_fetch_subtitle({
				monthLabel: local(1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
			})
		);

		// The month's weather: the past from the archive, today on from the forecast.
		expect(
			fake.requests.map((request) => {
				const url = new URL(request.url);
				return [url.host, url.searchParams.get('start_date'), url.searchParams.get('end_date')];
			})
		).toEqual([
			['archive-api.open-meteo.com', '2026-10-01', '2026-10-20'],
			['api.open-meteo.com', '2026-10-21', '2026-10-31']
		]);

		await vi.waitFor(() => expect(cellText(20)).not.toBe(''));
		expect(cellText(20)).toContain(formatCwMeasurement(18.4, '°', { decimals: 0 }));
		expect(cellText(20)).toContain(
			m.traffic_low_temperature({ value: formatCwMeasurement(9.6, '°', { decimals: 0 }) })
		);
		expect(cellText(20)).toContain(`🌧️ ${m.weather_rain()}`);
		expect(cellText(20)).toContain(`💧 ${formatMeasurement(3.25, 'mm', 1)}`);
		expect(cellText(20)).toContain(m.traffic_calendar_total({ count: formatNumber(7) }));
		expect(cellText(20)).toContain(`${metricLabel('car_count')}: ${formatNumber(6)}`);
		expect(cellText(20)).toContain(`${metricLabel('people_count')}: ${formatNumber(1)}`);
		expect(cellText(21)).toContain(`☀️ ${m.weather_clear()}`);
		expect(cellText(21)).toContain(m.traffic_calendar_total({ count: formatNumber(10) }));
		// Weather alone, and a day with neither.
		expect(cellText(22)).toContain(`☁️ ${m.weather_cloudy()}`);
		expect(dayCell(22)?.querySelector('.traffic-calendar__traffic-panel')).toBeNull();
		expect(dayCell(5)?.querySelector('.traffic-calendar__summary')).toBeNull();
	});

	it('asks the API as the signed-in user', async () => {
		const api = createFakeFetch((request) =>
			request.url.startsWith('https://api.cropwatch.test/')
				? jsonResponse(TRAFFIC)
				: weatherResponder(request)
		);
		const apiRequests = () =>
			api.requests.filter((sent) => sent.url.startsWith('https://api.cropwatch.test/'));
		vi.stubGlobal('fetch', api.fetch);
		// Wired as the root layout wires them: the token is read from the app context.
		const client = createClientServices({
			config: testPublicConfig(),
			authToken: () => view?.app.accessToken
		});
		const { app } = render({}, { accessToken: null, services: client });
		expect(apiRequests()).toHaveLength(0);

		// The root layout mirrors the session token into the app context.
		app.accessToken = 'jwt-token';
		flushSync();

		await vi.waitFor(() =>
			expect(cellText(21)).toContain(m.traffic_calendar_total({ count: formatNumber(10) }))
		);
		const [request] = apiRequests();
		const url = new URL(request.url);
		expect(apiRequests()).toHaveLength(1);
		expect([request.method, url.pathname]).toEqual(['GET', '/traffic/CAM-1']);
		expect(Object.fromEntries(url.searchParams)).toEqual(monthQuery(2026, 9));
		expect(request.headers.get('authorization')).toBe('Bearer jwt-token');
	});

	it('asks to sign in instead of loading without a session, and loads once signed in', async () => {
		getTraffic().mockResolvedValue(TRAFFIC);
		const { app } = render({}, { accessToken: null });

		expect(getTraffic()).not.toHaveBeenCalled();
		expect(chips()).toContainEqual({
			label: m.traffic_calendar_auth_required(),
			tone: 'cw-chip--danger'
		});

		app.accessToken = 'jwt-token';
		flushSync();

		expect(getTraffic()).toHaveBeenCalledTimes(1);
		await vi.waitFor(() =>
			expect(cellText(21)).toContain(m.traffic_calendar_total({ count: formatNumber(10) }))
		);
		expect(chipLabels()).not.toContain(m.traffic_calendar_auth_required());
	});

	it('reloads for a new session token and clears the month when the session ends', async () => {
		getTraffic().mockResolvedValue(TRAFFIC);
		const { app } = render();
		await vi.waitFor(() =>
			expect(cellText(21)).toContain(m.traffic_calendar_total({ count: formatNumber(10) }))
		);

		app.accessToken = 'jwt-token-refreshed';
		flushSync();
		expect(getTraffic()).toHaveBeenCalledTimes(2);
		await vi.waitFor(() =>
			expect(chipLabels()).toContain(m.traffic_month_traffic_days({ count: formatNumber(2) }))
		);

		app.accessToken = undefined;
		flushSync();
		expect(getTraffic()).toHaveBeenCalledTimes(2);
		expect(chipLabels()).toContain(m.traffic_calendar_auth_required());
		expect(dayCell(21)?.querySelector('.traffic-calendar__summary')).toBeNull();
	});

	it('shows the loading chip until the month arrives', async () => {
		let resolve!: (rows: TrafficDataPoint[]) => void;
		getTraffic().mockReturnValue(new Promise((done) => (resolve = done)));
		render();

		expect(chipLabels()).toContain(m.traffic_loading_visible_month());
		expect(previousMonthButton().disabled).toBe(true);

		resolve([]);
		await vi.waitFor(() => expect(chipLabels()).not.toContain(m.traffic_loading_visible_month()));
		expect(chipLabels()).toContain(m.traffic_no_data_this_month());
		expect(chipLabels()).toContain(m.traffic_month_traffic_days({ count: formatNumber(0) }));
	});

	it('loads the month the user moves to, but never past the current one', async () => {
		getTraffic().mockResolvedValue([]);
		render();
		await vi.waitFor(() => expect(previousMonthButton().disabled).toBe(false));
		expect(nextMonthButton().disabled).toBe(true);

		previousMonthButton().click();
		flushSync();

		expect(getTraffic()).toHaveBeenLastCalledWith('CAM-1', monthQuery(2026, 8));
		expect(document.body.textContent).toContain(
			m.traffic_calendar_fetch_subtitle({
				monthLabel: local(1, 0, 0, 8).toLocaleDateString(undefined, {
					month: 'long',
					year: 'numeric'
				})
			})
		);
		// September is all past: only the archive is asked.
		await vi.waitFor(() => expect(fake.requests).toHaveLength(3));
		expect(new URL(fake.requests[2].url).host).toBe('archive-api.open-meteo.com');
		await vi.waitFor(() => expect(nextMonthButton().disabled).toBe(false));

		nextMonthButton().click();
		flushSync();
		expect(getTraffic()).toHaveBeenLastCalledWith('CAM-1', monthQuery(2026, 9));
	});

	it("re-anchors on the new device's month when the device changes", async () => {
		getTraffic().mockResolvedValue([]);
		const props = $state(cardProps());
		render(props);
		await vi.waitFor(() => expect(previousMonthButton().disabled).toBe(false));
		previousMonthButton().click();
		flushSync();
		await vi.waitFor(() => expect(previousMonthButton().disabled).toBe(false));

		props.devEui = 'CAM-2';
		flushSync();

		expect(getTraffic()).toHaveBeenLastCalledWith('CAM-2', monthQuery(2026, 9));
		expect(getTraffic()).toHaveBeenCalledTimes(3);
	});

	it('only reloads when something it depends on changed', async () => {
		getTraffic().mockResolvedValue([]);
		const props = $state(cardProps());
		render(props);
		await vi.waitFor(() => expect(chipLabels()).toContain(m.traffic_no_data_this_month()));

		props.locationLabel = 'Main gate';
		flushSync();
		expect(getTraffic()).toHaveBeenCalledTimes(1);

		props.latitude = latitude + 0.5;
		flushSync();
		expect(getTraffic()).toHaveBeenCalledTimes(2);
	});

	it('ignores a month that arrives after a newer request', async () => {
		let resolveFirst!: (rows: TrafficDataPoint[]) => void;
		let rejectFirst!: (error: unknown) => void;
		getTraffic()
			.mockReturnValueOnce(new Promise((done) => (resolveFirst = done)))
			.mockReturnValueOnce(new Promise((_, fail) => (rejectFirst = fail)))
			.mockResolvedValue([TRAFFIC[2]]);
		const { app } = render();

		app.accessToken = 'jwt-2';
		flushSync();
		app.accessToken = 'jwt-3';
		flushSync();
		await vi.waitFor(() =>
			expect(cellText(21)).toContain(m.traffic_calendar_total({ count: formatNumber(10) }))
		);

		resolveFirst(TRAFFIC);
		rejectFirst(new Error('too late'));
		await new Promise((done) => setTimeout(done, 20));
		flushSync();

		expect(cellText(20)).not.toContain(m.traffic_calendar_total({ count: formatNumber(7) }));
		expect(chipLabels()).not.toContain(m.traffic_load_month_failed());
		expect(chipLabels()).not.toContain(m.traffic_loading_visible_month());
	});

	it("says when the month's traffic cannot be loaded", async () => {
		const error = new Error('API down');
		getTraffic().mockRejectedValue(error);
		render();

		await vi.waitFor(() =>
			expect(chips()).toContainEqual({
				label: m.traffic_load_month_failed(),
				tone: 'cw-chip--danger'
			})
		);
		expect(console.error).toHaveBeenCalledWith('Failed to fetch calendar month traffic:', error);
		expect(chipLabels()).not.toContain(m.traffic_no_data_this_month());
	});

	it('still shows the traffic when the weather cannot be loaded', async () => {
		vi.stubGlobal('fetch', createFakeFetch(() => jsonResponse({}, { status: 503 })).fetch);
		getTraffic().mockResolvedValue(TRAFFIC);
		render();

		await vi.waitFor(() =>
			expect(cellText(21)).toContain(m.traffic_calendar_total({ count: formatNumber(10) }))
		);
		expect(console.error).toHaveBeenCalledWith(
			'Failed to fetch calendar weather:',
			expect.any(Error)
		);
		expect(dayCell(21)?.querySelector('.traffic-calendar__weather-panel')).toBeNull();
	});

	it('skips the weather without coordinates, and shows the class-less total', async () => {
		getTraffic().mockResolvedValue([
			{ id: 9, created_at: iso(21, 7, 30) }
		] as unknown as TrafficDataPoint[]);
		render({
			latitude: null,
			longitude: null,
			locationLabel: m.traffic_device_coordinates_unavailable()
		});

		await vi.waitFor(() =>
			expect(cellText(21)).toContain(m.traffic_calendar_total({ count: formatNumber(1) }))
		);
		expect(cellText(21)).toContain(m.traffic_no_class_data_recorded());
		expect(fake.requests).toHaveLength(0);
		expect(chips()).toContainEqual({
			label: m.traffic_lat_lng_label({ label: m.traffic_device_coordinates_unavailable() }),
			tone: 'cw-chip--warning'
		});
	});

	it('loads nothing for a blank device, and starts on the current month without an anchor', () => {
		render({ devEui: '  ', anchorDate: null });

		expect(getTraffic()).not.toHaveBeenCalled();
		expect(chipLabels()).toContain(m.traffic_no_data_this_month());
		expect(chipLabels()).not.toContain(m.traffic_calendar_auth_required());
		expect(document.body.textContent).toContain(
			m.traffic_calendar_fetch_subtitle({
				monthLabel: local(1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
			})
		);
	});
});
