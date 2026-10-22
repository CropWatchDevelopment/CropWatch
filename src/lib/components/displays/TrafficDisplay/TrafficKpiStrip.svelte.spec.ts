import { CW_EMPTY_VALUE, formatCwMeasurement } from '@cropwatchdevelopment/cwui';
import { afterEach, describe, expect, it } from 'vitest';
import { formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import {
	buildHourlyTrafficRows,
	computeTrafficKpis,
	formatHour,
	formatMeasurement,
	metricLabelText,
	type TrafficKpis,
	type TrafficRow
} from './traffic-data';
import type { WeatherDaySummary } from './traffic-weather';
import TrafficKpiStrip from './TrafficKpiStrip.svelte';

const local = (hour: number, minute = 0) => new Date(2026, 9, 21, hour, minute);
const KEYS = ['car_count', 'people_count'];
const HOURLY = buildHourlyTrafficRows(
	[
		{
			id: 'a',
			created_at: local(8, 10).toISOString(),
			dev_eui: 'CAM-1',
			car_count: 3,
			people_count: 1
		},
		{
			id: 'b',
			created_at: local(9, 10).toISOString(),
			dev_eui: 'CAM-1',
			car_count: 10,
			people_count: 2
		}
	] as TrafficRow[],
	KEYS
);

const WEATHER: WeatherDaySummary = {
	dayKey: '2026-10-21',
	summary: 'Rain',
	label: m.weather_rain(),
	tone: 'info',
	temperatureLabel: '18° / 10°C',
	temperatureHighC: 18.4,
	temperatureLowC: 9.6,
	precipitationMm: 3.25,
	windSpeedKmh: 14.4,
	weatherCode: 61
};

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	props: Partial<{
		kpis: TrafficKpis;
		loading: boolean;
		weather: WeatherDaySummary | null;
		weatherLoading: boolean;
		weatherError: string | null;
	}> = {}
) {
	view = renderWithServices(TrafficKpiStrip, {
		props: {
			kpis: computeTrafficKpis(HOURLY, KEYS, local(9, 30)),
			loading: false,
			weather: WEATHER,
			weatherLoading: false,
			weatherError: null,
			locationLabel: '35.6895, 139.6917',
			...props
		}
	});
	return [...view.target.querySelectorAll('.traffic-kpis__tile')].map((tile) =>
		(tile.textContent ?? '').replace(/\s+/g, ' ').trim()
	);
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('TrafficKpiStrip', () => {
	it("shows today's total, the current and peak hour, the busiest class and the weather", () => {
		const [total, current, peak, topClass, weather] = render();

		expect(total).toContain(m.traffic_today_total());
		expect(total).toContain(formatNumber(16));
		expect(total).toContain(m.traffic_tracked_hours_count({ count: formatNumber(2) }));
		expect(current).toContain(m.traffic_current_hour_today());
		expect(current).toContain(formatNumber(12));
		expect(current).toContain(formatHour(HOURLY[1].traffic_hour));
		expect(peak).toContain(m.traffic_peak_hour());
		expect(peak).toContain(`${formatNumber(12)} ${formatHour(HOURLY[1].traffic_hour)}`);
		expect(topClass).toContain(m.traffic_top_class());
		expect(topClass).toContain(`🚗 ${formatNumber(13)} ${metricLabelText('car_count')}`);
		expect(weather).toContain(m.traffic_daily_weather());
		expect(weather).toContain(`🌧️ ${formatCwMeasurement(18.4, '°', { decimals: 0 })}`);
		expect(weather).toContain(
			m.traffic_low_temperature({ value: formatCwMeasurement(9.6, '°', { decimals: 0 }) })
		);
		expect(weather).toContain(
			`${m.weather_rain()} · 💧 ${formatMeasurement(3.25, 'mm', 1)} · 💨 ${formatMeasurement(14.4, 'km/h')}`
		);
		expect(weather).toContain('📍 35.6895, 139.6917');
	});

	it('labels the latest hour with data when the current one has none yet', () => {
		const [, current] = render({ kpis: computeTrafficKpis(HOURLY, KEYS, local(11)) });

		expect(current).toContain(m.traffic_latest_available_hour_today());
		expect(current).toContain(formatHour(HOURLY[1].traffic_hour));
	});

	it('shows a spinner for the current hour while the first data loads', () => {
		render({ kpis: computeTrafficKpis([], [], local(9)), loading: true });

		expect(view!.target.querySelectorAll('.traffic-kpis__value--pending')).toHaveLength(1);
	});

	it('shows empty tiles for a day without traffic', () => {
		const [total, current, peak, topClass] = render({
			kpis: computeTrafficKpis([], [], local(9))
		});

		expect(total).toContain(formatNumber(0));
		expect(current).toContain(`0 ${m.traffic_no_traffic_today()}`);
		expect(peak).toContain(`${CW_EMPTY_VALUE} ${m.traffic_no_traffic_today()}`);
		expect(topClass).toContain(`${CW_EMPTY_VALUE} ${m.traffic_no_class_data_recorded()}`);
	});

	it("shows the weather's loading, error and unavailable states", () => {
		render({ weather: null, weatherLoading: true });
		expect(view!.target.querySelectorAll('.traffic-kpis__value--pending')).toHaveLength(1);
		view!.unmount();

		let [, , , , weather] = render({ weather: null, weatherError: 'Weather is down' });
		expect(weather).toBe(`${m.traffic_daily_weather()} Weather is down`);
		view!.unmount();

		[, , , , weather] = render({ weather: null });
		expect(weather).toBe(`${m.traffic_daily_weather()} ${m.traffic_weather_unavailable()}`);
	});

	it('keeps showing the weather it has while a refresh loads, with dashes for missing values', () => {
		const [, , , , weather] = render({
			weatherLoading: true,
			weather: { ...WEATHER, temperatureLowC: null, precipitationMm: null, windSpeedKmh: null }
		});

		expect(weather).toContain(m.traffic_low_temperature({ value: CW_EMPTY_VALUE }));
		expect(weather).toContain(
			`💧 ${formatMeasurement(null, 'mm', 1)} · 💨 ${formatMeasurement(null, 'km/h')}`
		);
	});
});
