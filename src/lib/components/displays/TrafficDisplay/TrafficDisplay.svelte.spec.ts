import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrafficDataPoint } from '$lib/api/api.dtos';
import { formatNumber } from '$lib/i18n/format';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse, type RecordedRequest } from '$lib/testing/http';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { getMonthBounds } from './traffic-data';
import TrafficDisplay from './TrafficDisplay.svelte';

// The display reads the device's coordinates from the route data.
const { pageState } = vi.hoisted(() => ({
	pageState: { data: {} as Record<string, unknown> }
}));
vi.mock('$app/state', () => ({ page: pageState }));

const local = (day: number, hour = 0, minute = 0, month = 9) =>
	new Date(2026, month, day, hour, minute);
const iso = (day: number, hour = 0, minute = 0, month = 9) =>
	local(day, hour, minute, month).toISOString();

/** Newest first, as the device page passes it: two hours today and one yesterday. */
const HISTORY = [
	{ id: 3, created_at: iso(21, 9, 5), traffic_hour: iso(21, 9), car_count: 6, people_count: 2 },
	{ id: 2, created_at: iso(21, 8, 5), traffic_hour: iso(21, 8), car_count: 3, people_count: 1 },
	{ id: 1, created_at: iso(20, 17, 5), traffic_hour: iso(20, 17), car_count: 50, people_count: 9 }
];
/** The latest reading: the current hour's accumulator row. */
const LATEST = {
	id: 4,
	created_at: iso(21, 10, 5),
	traffic_hour: iso(21, 10),
	car_count: 1,
	people_count: 4
};

/** Open-Meteo, answering every requested day as clear (code 0, 20° / 10°). */
function weatherResponder(request: RecordedRequest) {
	const url = new URL(request.url);
	const days: string[] = [];
	const cursor = new Date(`${url.searchParams.get('start_date')}T12:00:00`);
	const end = new Date(`${url.searchParams.get('end_date')}T12:00:00`);
	for (; cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
		days.push(
			`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
		);
	}
	return jsonResponse({
		daily: {
			time: days,
			weather_code: days.map(() => 0),
			temperature_2m_max: days.map(() => 20),
			temperature_2m_min: days.map(() => 10),
			precipitation_sum: days.map(() => 0),
			wind_speed_10m_max: days.map(() => 5)
		}
	});
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;
let fake: ReturnType<typeof createFakeFetch>;
// The weather module caches per coordinates for the session: one per test.
let latitude = 40;

function displayProps(overrides: Partial<DeviceDisplayProps> = {}): DeviceDisplayProps {
	return {
		devEui: 'CAM-1',
		locationId: '8',
		locationName: 'Main gate',
		latestData: LATEST,
		historicalData: HISTORY,
		loading: false,
		permissionLevel: 1,
		...overrides
	};
}

function render(overrides: Partial<DeviceDisplayProps> = {}) {
	view = renderWithServices(TrafficDisplay, {
		props: displayProps(overrides),
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view.target;
}

const tiles = () =>
	[...document.querySelectorAll('.traffic-kpis__tile')].map((tile) =>
		(tile.textContent ?? '').replace(/\s+/g, ' ').trim()
	);
const weatherTile = () => tiles()[4];
const hourlyTableRows = () => document.querySelectorAll('.cw-data-table tbody tr');
/** The single days weather was asked for, one entry per request (today's weather). */
const todayWeatherDays = (requests = fake.requests) =>
	requests
		.map((request) => new URL(request.url).searchParams)
		.filter((params) => params.get('start_date') === params.get('end_date'))
		.map((params) => params.get('start_date'));

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(local(21, 10, 30));
	latitude += 1;
	pageState.data = { device: { lat: latitude, long: 139.6917 } };
	services = createMockServices();
	services.telemetry.getTrafficData.mockResolvedValue([] as TrafficDataPoint[]);
	fake = createFakeFetch(weatherResponder);
	vi.stubGlobal('fetch', fake.fetch);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	document.body.className = '';
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('TrafficDisplay', () => {
	it("shows today's traffic with the weather at the device", async () => {
		render();

		const [total, current, peak, topClass] = tiles();
		// Today only: yesterday's 17:00 row is left out; the latest reading counts.
		expect(total).toContain(formatNumber(17));
		expect(total).toContain(m.traffic_tracked_hours_count({ count: formatNumber(3) }));
		expect(current).toContain(m.traffic_current_hour_today());
		expect(current).toContain(formatNumber(5));
		expect(peak).toContain(formatNumber(8));
		expect(topClass).toContain(formatNumber(10));

		await vi.waitFor(() => expect(weatherTile()).toContain(m.weather_clear()));
		expect(weatherTile()).toContain(`📍 ${latitude.toFixed(4)}, 139.6917`);
		expect(todayWeatherDays()).toEqual(['2026-10-21']);

		expect(document.body.textContent).toContain(m.traffic_chart_hourly_title());
		expect(document.body.textContent).toContain(m.traffic_class_breakdown());
		await vi.waitFor(() => expect(hourlyTableRows()).toHaveLength(3));
		// The calendar opens on the month of the latest reading.
		const { start, end } = getMonthBounds(2026, 9);
		expect(services.telemetry.getTrafficData).toHaveBeenCalledWith('CAM-1', {
			start: start.toISOString(),
			end: end.toISOString()
		});
	});

	it("reads the coordinates from the device's location when the device has none", async () => {
		pageState.data = {
			device: { lat: 'unknown', cw_locations: { lat: String(latitude), long: '139.2' } }
		};
		render();

		await vi.waitFor(() => expect(weatherTile()).toContain(m.weather_clear()));
		expect(weatherTile()).toContain(`📍 ${latitude.toFixed(4)}, 139.2000`);
	});

	it('explains that the weather needs coordinates', () => {
		for (const data of [
			{ device: { lat: latitude } },
			{ device: { cw_locations: { lat: latitude } } },
			{ device: 'CAM-1' },
			{}
		]) {
			pageState.data = data;
			render();

			expect(weatherTile()).toContain(m.traffic_weather_requires_coordinates());
			expect(document.body.textContent).toContain(
				m.traffic_lat_lng_label({ label: m.traffic_device_coordinates_unavailable() })
			);
			view?.unmount();
			view = null;
		}
		expect(fake.requests).toHaveLength(0);
	});

	it("asks for today's weather once, also when the calendar's month arrives first", async () => {
		let answerToday!: () => void;
		const held = createFakeFetch((request) =>
			todayWeatherDays([request]).length > 0
				? new Promise<Response>((done) => (answerToday = () => done(weatherResponder(request))))
				: weatherResponder(request)
		);
		vi.stubGlobal('fetch', held.fetch);
		render();

		// The calendar's month weather lands while today's is still on the way.
		await vi.waitFor(() =>
			expect(document.querySelector('.traffic-calendar__weather-panel')).not.toBeNull()
		);
		answerToday();

		await vi.waitFor(() => expect(weatherTile()).toContain(m.weather_clear()));
		expect(todayWeatherDays(held.requests)).toEqual(['2026-10-21']);
	});

	it("says when today's weather cannot be loaded", async () => {
		vi.stubGlobal('fetch', createFakeFetch(() => jsonResponse({}, { status: 503 })).fetch);
		render();

		await vi.waitFor(() => expect(weatherTile()).toContain(m.traffic_weather_today_failed()));
		expect(console.error).toHaveBeenCalledWith(
			'Failed to fetch selected-period weather:',
			expect.any(Error)
		);
	});

	it('ignores a weather answer for a day that is no longer today', async () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 9, 21, 23, 59, 30));
		let answerFirst!: (response: Response) => void;
		const slow = createFakeFetch((request) =>
			new URL(request.url).searchParams.get('start_date') === '2026-10-21'
				? new Promise<Response>((done) => (answerFirst = done))
				: weatherResponder(request)
		);
		vi.stubGlobal('fetch', slow.fetch);
		render({ historicalData: [], latestData: null });

		vi.advanceTimersByTime(60_000);
		flushSync();
		await vi.waitFor(() => expect(weatherTile()).toContain(m.weather_clear()));

		answerFirst(jsonResponse({}, { status: 500 }));
		await new Promise((done) => setTimeout(done, 20));
		flushSync();
		expect(weatherTile()).toContain(m.weather_clear());
		expect(weatherTile()).not.toContain(m.traffic_weather_today_failed());
	});

	it('moves "today" on at midnight', async () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 9, 21, 23, 59, 30));
		render({
			latestData: null,
			historicalData: [
				{ id: 1, created_at: iso(21, 23, 10), traffic_hour: iso(21, 23), car_count: 5 }
			]
		});
		expect(tiles()[0]).toContain(formatNumber(5));

		vi.advanceTimersByTime(60_000);
		flushSync();

		expect(tiles()[0]).toContain(formatNumber(0));
		expect(tiles()[1]).toContain(m.traffic_no_traffic_today());
		await vi.waitFor(() => expect(todayWeatherDays()).toEqual(['2026-10-21', '2026-10-22']));
	});

	it('opens the calendar on the month of the latest reading', () => {
		render({ latestData: { ...LATEST, created_at: iso(10, 8, 0, 8) }, historicalData: [] });

		const { start, end } = getMonthBounds(2026, 8);
		expect(services.telemetry.getTrafficData).toHaveBeenCalledWith('CAM-1', {
			start: start.toISOString(),
			end: end.toISOString()
		});
	});

	it('shows the loading state before the first data arrives', () => {
		render({ latestData: null, historicalData: [], loading: true });

		expect(document.body.textContent).toContain(m.traffic_fetching_traffic_data());
		expect(document.querySelectorAll('.traffic-kpis__value--pending').length).toBeGreaterThan(0);
	});

	it("exports today's hours with today's weather", async () => {
		let csv: Promise<string> | null = null;
		let fileName = '';
		vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
			csv = (blob as Blob).text();
			return 'blob:traffic-hourly';
		});
		vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
		vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
			this: HTMLAnchorElement
		) {
			fileName = this.download;
		});
		render();
		await vi.waitFor(() => expect(weatherTile()).toContain(m.weather_clear()));

		document.querySelector<HTMLButtonElement>('.traffic-hourly-table__actions button')!.click();

		await vi.waitFor(() => expect(fileName).toBe('Main_gate-CAM-1-2026-10-21-traffic-hourly.csv'));
		const lines = (await csv!).split('\n');
		expect(lines).toHaveLength(4);
		expect(lines.slice(1).every((line) => line.includes(`,${m.weather_clear()},`))).toBe(true);
	});

	it('marks the device page as a traffic page while it is shown', () => {
		document.body.classList.add('device-page');
		render();

		expect(document.body.classList).toContain('device-page--traffic');

		view?.unmount();
		view = null;
		expect(document.body.classList).not.toContain('device-page--traffic');
	});
});
