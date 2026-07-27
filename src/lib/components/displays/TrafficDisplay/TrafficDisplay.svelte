<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { CwCard } from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import TrafficCalendarCard from './TrafficCalendarCard.svelte';
	import TrafficClassBreakdown from './TrafficClassBreakdown.svelte';
	import TrafficHourlyChart from './TrafficHourlyChart.svelte';
	import TrafficHourlyTable from './TrafficHourlyTable.svelte';
	import TrafficKpiStrip from './TrafficKpiStrip.svelte';
	import {
		buildHourlyTrafficRows,
		computeTrafficKpis,
		getDayBounds,
		isRecord,
		normalizeTrafficRows,
		parseDate,
		readNumber,
		resolveTrafficClassKeys,
		toDayKey,
		type TelemetryRow,
		type TrafficRow
	} from './traffic-data';
	import { fetchWeatherByRange, type WeatherDaySummary } from './traffic-weather';

	let { latestData, historicalData, loading, locationName, devEui, authToken }: DeviceDisplayProps =
		$props();

	/* ── Device coordinates (route data) ──────────────────────────────── */

	let routeDevice = $derived.by<TelemetryRow | null>(() => {
		const routeData = page.data as Record<string, unknown>;
		return isRecord(routeData.device) ? routeData.device : null;
	});

	function readCoordinate(source: TelemetryRow | null, key: 'lat' | 'long'): number | null {
		if (!source) return null;

		const directValue = readNumber(source[key]);
		if (directValue !== null) return directValue;

		const nestedLocation = isRecord(source.cw_locations) ? source.cw_locations : null;
		if (nestedLocation) {
			const nestedValue = readNumber(nestedLocation[key]);
			if (nestedValue !== null) return nestedValue;
		}

		return null;
	}

	let deviceLatitude = $derived.by<number | null>(() => readCoordinate(routeDevice, 'lat'));
	let deviceLongitude = $derived.by<number | null>(() => readCoordinate(routeDevice, 'long'));
	let locationLabel = $derived(
		deviceLatitude !== null && deviceLongitude !== null
			? `${deviceLatitude.toFixed(4)}, ${deviceLongitude.toFixed(4)}`
			: m.traffic_device_coordinates_unavailable()
	);

	/* ── Today's rows, hourly buckets, KPIs ───────────────────────────── */

	let now = $state(new Date());

	let allRows = $derived.by<TrafficRow[]>(() =>
		normalizeTrafficRows(historicalData, devEui, latestData)
	);
	let todayBounds = $derived.by(() => getDayBounds(now));
	let todayDayKey = $derived(toDayKey(todayBounds.start));
	let todayRows = $derived.by<TrafficRow[]>(() => {
		const { start, end } = todayBounds;

		return allRows.filter((row) => {
			const timestamp = parseDate(row.created_at);
			return timestamp !== null && timestamp >= start && timestamp <= end;
		});
	});
	let classKeys = $derived.by<string[]>(() => resolveTrafficClassKeys(todayRows));
	let hourlyRows = $derived.by(() => buildHourlyTrafficRows(todayRows, classKeys));
	let kpis = $derived.by(() => computeTrafficKpis(hourlyRows, classKeys, now));

	/* ── Today's weather (Open-Meteo, daily granularity) ──────────────── */

	let weatherByDay = $state<Record<string, WeatherDaySummary>>({});
	let weatherLoading = $state(false);
	let weatherError = $state<string | null>(null);
	let weatherRequestId = 0;

	let currentDayWeather = $derived(weatherByDay[todayDayKey] ?? null);

	$effect(() => {
		const dayKey = todayDayKey;
		const bounds = todayBounds;
		const latitude = deviceLatitude;
		const longitude = deviceLongitude;
		void dayKey;

		weatherRequestId += 1;
		const requestId = weatherRequestId;

		if (latitude === null || longitude === null) {
			weatherByDay = {};
			weatherLoading = false;
			weatherError = m.traffic_weather_requires_coordinates();
			return;
		}

		weatherLoading = true;
		weatherError = null;

		fetchWeatherByRange(bounds.start, bounds.end, latitude, longitude)
			.then((weather) => {
				if (requestId !== weatherRequestId) return;
				weatherByDay = weather;
			})
			.catch((error) => {
				if (requestId !== weatherRequestId) return;
				console.error('Failed to fetch selected-period weather:', error);
				weatherByDay = {};
				weatherError = m.traffic_weather_today_failed();
			})
			.finally(() => {
				if (requestId === weatherRequestId) {
					weatherLoading = false;
				}
			});
	});

	let anchorDate = $derived(parseDate(isRecord(latestData) ? latestData.created_at : null));

	onMount(() => {
		const devicePage = document.querySelector('.traffic-display')?.closest('.device-page');
		devicePage?.classList.add('device-page--traffic');

		// A minute tick keeps "today"/"current hour" boundaries honest; data
		// refresh itself is driven by the page-level scheduler via props.
		const intervalId = window.setInterval(() => {
			now = new Date();
		}, 60_000);

		return () => {
			window.clearInterval(intervalId);
			devicePage?.classList.remove('device-page--traffic');
		};
	});
</script>

<div class="traffic-display">
	<TrafficKpiStrip
		{kpis}
		{loading}
		weather={currentDayWeather}
		{weatherLoading}
		{weatherError}
		{locationLabel}
	/>

	<div class="traffic-display__viz-grid">
		<CwCard
			title={m.traffic_chart_hourly_title()}
			subtitle={m.traffic_chart_hourly_subtitle()}
			elevated
			class="traffic-display__chart-card"
		>
			<TrafficHourlyChart {hourlyRows} {classKeys} dayStart={todayBounds.start} />
		</CwCard>

		<CwCard
			title={m.traffic_class_breakdown()}
			subtitle={m.traffic_class_breakdown_subtitle()}
			elevated
		>
			<TrafficClassBreakdown {classKeys} classTotals={kpis.classTotals} />
		</CwCard>
	</div>

	<TrafficHourlyTable
		{hourlyRows}
		{classKeys}
		{locationName}
		{devEui}
		{todayDayKey}
		{todayBounds}
		latitude={deviceLatitude}
		longitude={deviceLongitude}
		{weatherByDay}
		{loading}
	/>

	<TrafficCalendarCard
		{devEui}
		{authToken}
		latitude={deviceLatitude}
		longitude={deviceLongitude}
		{anchorDate}
		{locationLabel}
	/>
</div>

<style>
	.traffic-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.traffic-display__viz-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		align-items: start;
	}

	@media (min-width: 1024px) {
		.traffic-display__viz-grid {
			grid-template-columns: minmax(0, 2fr) minmax(16rem, 1fr);
		}
	}

	:global(.device-page--traffic .device-page__group--ranges) {
		display: none;
	}
</style>
