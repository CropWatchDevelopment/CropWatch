import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import {
	buildHourlyTrafficRows,
	formatDay,
	formatHour,
	formatTrafficValue,
	metricLabel,
	type HourlyTrafficRow,
	type TrafficRow
} from './traffic-data';
import type { WeatherDaySummary } from './traffic-weather';
import TrafficHourlyTable from './TrafficHourlyTable.svelte';

const KEYS = ['car_count', 'people_count'];
const local = (hour: number, minute = 0) => new Date(2026, 9, 21, hour, minute);
const HOURLY = buildHourlyTrafficRows(
	[
		{ created_at: local(8, 10).toISOString(), car_count: 3, people_count: 1 },
		{ created_at: local(9, 10).toISOString(), car_count: 10, people_count: 2 },
		{ created_at: local(10, 5).toISOString(), car_count: 1, people_count: 0 }
	].map((row, index) => ({ id: `r${index}`, dev_eui: 'CAM-1', ...row })) as TrafficRow[],
	KEYS
);

const WEATHER: WeatherDaySummary = {
	dayKey: '2026-10-21',
	summary: 'Rain "heavy"',
	label: 'Rain, heavy',
	tone: 'info',
	temperatureLabel: '18° / 10°C',
	temperatureHighC: 18.4,
	temperatureLowC: 9.6,
	precipitationMm: 3.25,
	windSpeedKmh: 14.4,
	weatherCode: 61
};

interface Props {
	hourlyRows: HourlyTrafficRow[];
	classKeys: string[];
	locationName: string;
	devEui: string;
	todayDayKey: string;
	todayBounds: { start: Date; end: Date };
	latitude: number | null;
	longitude: number | null;
	weatherByDay: Record<string, WeatherDaySummary>;
	loading: boolean;
}

function tableProps(overrides: Partial<Props> = {}): Props {
	return {
		hourlyRows: HOURLY,
		classKeys: KEYS,
		locationName: 'Main gate',
		devEui: 'CAM-1',
		todayDayKey: '2026-10-21',
		todayBounds: { start: local(0), end: new Date(2026, 9, 21, 23, 59, 59, 999) },
		latitude: null,
		longitude: null,
		weatherByDay: { '2026-10-21': WEATHER },
		loading: false,
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;
let downloads: Array<{ fileName: string; csv: Promise<string> }> = [];
// The weather module caches per coordinates for the session: one per test.
let latitude = 10;

function render(props: Partial<Props> | Props = {}) {
	view = renderWithServices(TrafficHourlyTable, {
		props: 'hourlyRows' in props && 'todayBounds' in props ? (props as Props) : tableProps(props)
	});
	return view.target;
}

const tableRows = (target: HTMLElement) =>
	[...target.querySelectorAll('.cw-data-table tbody tr')].map((tr) =>
		[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim())
	);
const csvButton = (target: HTMLElement) =>
	target.querySelector<HTMLButtonElement>('.traffic-hourly-table__actions button')!;
const header = (target: HTMLElement, label: string) =>
	[...target.querySelectorAll('.cw-data-table th')].find((th) => th.textContent?.trim() === label)!;

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(local(12));
	latitude += 1;
	downloads = [];
	let blob: Blob | null = null;
	vi.spyOn(URL, 'createObjectURL').mockImplementation((value) => {
		blob = value as Blob;
		return 'blob:traffic-hourly';
	});
	vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
		this: HTMLAnchorElement
	) {
		downloads.push({ fileName: this.download, csv: blob!.text() });
	});
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	vi.useRealTimers();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('TrafficHourlyTable table', () => {
	it("lists today's hours newest first, one column per class", async () => {
		const target = render();

		await expect.poll(() => tableRows(target).length).toBe(3);
		expect(target.textContent).toContain(m.traffic_hourly_traffic());
		expect(target.textContent).toContain(m.traffic_hourly_traffic_subtitle());
		expect(
			[...target.querySelectorAll('.cw-data-table th')].map((th) => th.textContent?.trim())
		).toEqual([
			m.traffic_hour(),
			m.traffic_total_traffic(),
			metricLabel('car_count'),
			metricLabel('people_count')
		]);
		expect(tableRows(target)).toEqual(
			[...HOURLY]
				.reverse()
				.map((row) => [
					formatHour(row.traffic_hour),
					formatTrafficValue(row.total_traffic),
					formatTrafficValue(row.car_count),
					formatTrafficValue(row.people_count)
				])
		);
	});

	it('searches the hours by their values', async () => {
		const target = render();
		await expect.poll(() => tableRows(target).length).toBe(3);
		const search = target.querySelector<HTMLInputElement>('.cw-data-table__search-wrapper input')!;

		search.value = ' 12 ';
		search.dispatchEvent(new Event('input', { bubbles: true }));

		await expect.poll(() => tableRows(target).length).toBe(1);
		expect(tableRows(target)[0][1]).toBe(formatTrafficValue(12));
	});

	it('sorts by a count or by the hour', async () => {
		const target = render();
		await expect.poll(() => tableRows(target).length).toBe(3);

		header(target, m.traffic_total_traffic()).querySelector('button')!.click();
		await expect
			.poll(() => tableRows(target).map((row) => row[1]))
			.toEqual([1, 4, 12].map(formatTrafficValue));
		header(target, m.traffic_total_traffic()).querySelector('button')!.click();
		await expect
			.poll(() => tableRows(target).map((row) => row[1]))
			.toEqual([12, 4, 1].map(formatTrafficValue));

		header(target, m.traffic_hour()).querySelector('button')!.click();
		await expect
			.poll(() => tableRows(target).map((row) => row[0]))
			.toEqual(HOURLY.map((row) => formatHour(row.traffic_hour)));
	});

	it('refreshes when new telemetry arrives', async () => {
		const props = $state(tableProps());
		const target = render(props);
		await expect.poll(() => tableRows(target).length).toBe(3);

		props.hourlyRows = HOURLY.slice(0, 1);

		await expect.poll(() => tableRows(target).length).toBe(1);
	});

	it('says when there is no traffic today, or that it is still fetching', () => {
		let target = render({ hourlyRows: [] });
		expect(target.textContent).toContain(m.traffic_no_data_today());
		expect(target.querySelector('.cw-data-table')).toBeNull();
		expect(csvButton(target).disabled).toBe(true);
		view!.unmount();

		target = render({ hourlyRows: [], loading: true });
		expect(target.textContent).toContain(m.traffic_fetching_traffic_data());
		view!.unmount();

		// Rows already shown stay while a refresh loads.
		target = render({ loading: true });
		expect(target.querySelector('.cw-data-table')).not.toBeNull();
	});
});

describe('TrafficHourlyTable CSV export', () => {
	const CSV_HEADER =
		'traffic_hour,day,total_traffic,samples,weather_label,weather_summary,weather_code,weather_temp_high_c,weather_temp_low_c,weather_precip_mm,weather_wind_kmh,car_count,people_count';

	/** CSV quoting (RFC 4180): a field with a comma, a quote or a line break is quoted. */
	const csvField = (value: string | number) => {
		const text = String(value);
		return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
	};

	const csvLine = (row: HourlyTrafficRow, weatherFields: string) =>
		[
			csvField(formatHour(row.traffic_hour)),
			csvField(formatDay(new Date(row.hour_timestamp))),
			row.total_traffic,
			row.samples,
			weatherFields,
			row.car_count,
			row.people_count
		].join(',');

	it("downloads today's hours with the day's weather", async () => {
		const target = render();
		expect(csvButton(target).textContent?.trim()).toBe(m.traffic_download_hourly_csv());

		csvButton(target).click();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		expect(downloads[0].fileName).toBe('Main_gate-CAM-1-2026-10-21-traffic-hourly.csv');
		const lines = (await downloads[0].csv).split('\n');
		expect(lines[0]).toBe(CSV_HEADER);
		expect(lines.slice(1)).toEqual(
			HOURLY.map((row) => csvLine(row, '"Rain, heavy","Rain ""heavy""",61,18.4,9.6,3.25,14.4'))
		);
	});

	it('marks the weather unavailable for a day without any', async () => {
		const target = render({ weatherByDay: {}, hourlyRows: HOURLY.slice(0, 1) });

		csvButton(target).click();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		const [, line] = (await downloads[0].csv).split('\n');
		expect(line).toBe(
			csvLine(
				HOURLY[0],
				`${csvField(m.traffic_unavailable())},${csvField(m.traffic_weather_unavailable())},,,,,`
			)
		);
	});

	it('names the file safely, with defaults for blank names', async () => {
		const target = render({ locationName: '  ', devEui: ' ' });

		csvButton(target).click();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		expect(downloads[0].fileName).toBe('location-device-2026-10-21-traffic-hourly.csv');
		view!.unmount();

		const other = render({ locationName: 'Gate #2 (north)', devEui: 'cam/7' });
		csvButton(other).click();
		await vi.waitFor(() => expect(downloads).toHaveLength(2));
		expect(downloads[1].fileName).toBe('Gate__2__north_-cam_7-2026-10-21-traffic-hourly.csv');
	});

	it("refreshes the day's weather first when the device has coordinates", async () => {
		let respond!: (response: Response) => void;
		const fake = createFakeFetch(() => new Promise<Response>((done) => (respond = done)));
		vi.stubGlobal('fetch', fake.fetch);
		const target = render({ latitude, longitude: 139.6917, hourlyRows: HOURLY.slice(0, 1) });

		csvButton(target).click();
		flushSync();

		expect(csvButton(target).disabled).toBe(true);
		expect(csvButton(target).textContent?.trim()).toBe(m.traffic_preparing_csv());
		expect(fake.requests).toHaveLength(1);
		const url = new URL(fake.requests[0].url);
		expect(url.origin + url.pathname).toBe('https://api.open-meteo.com/v1/forecast');
		expect(url.searchParams.get('start_date')).toBe('2026-10-21');
		expect(url.searchParams.get('end_date')).toBe('2026-10-21');

		respond(
			jsonResponse({
				daily: {
					time: ['2026-10-21'],
					weather_code: [0],
					temperature_2m_max: [22],
					temperature_2m_min: [12],
					precipitation_sum: [0],
					wind_speed_10m_max: [5]
				}
			})
		);

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		const [, line] = (await downloads[0].csv).split('\n');
		expect(line).toContain(`,${csvField(m.weather_clear())},`);
		expect(line).toContain(',0,22,12,0,5,');
		expect(csvButton(target).textContent?.trim()).toBe(m.traffic_download_hourly_csv());
	});

	it('falls back to the weather it has when the refresh fails', async () => {
		vi.stubGlobal(
			'fetch',
			createFakeFetch(() => jsonResponse({ reason: 'busy' }, { status: 503 })).fetch
		);
		const target = render({ latitude, longitude: 139.6917, hourlyRows: HOURLY.slice(0, 1) });

		csvButton(target).click();

		await vi.waitFor(() => expect(downloads).toHaveLength(1));
		expect(console.error).toHaveBeenCalledWith('Failed to refresh CSV weather:', expect.any(Error));
		const [, line] = (await downloads[0].csv).split('\n');
		expect(line).toContain('"Rain, heavy"');
	});
});
