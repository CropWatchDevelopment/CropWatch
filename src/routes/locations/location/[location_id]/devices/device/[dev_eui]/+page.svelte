<script lang="ts">
	import { page } from '$app/state';
	import { fetchDeviceHistory } from '$lib/data/SourceOfTruth.svelte';
	import type { Device } from '$lib/Interfaces/device.interface';
	import { getContext, onMount } from 'svelte';
	import type { AppState } from '$lib/Interfaces/appState.interface';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import type { DateRangeValue } from '$lib/components/CWDateRangePicker.svelte';
	import TrafficDashboard from '$lib/components/traffic/TrafficDashboard.svelte';
	import DeviceActionBar from '$lib/components/pages/device/DeviceActionBar.svelte';
	import DeviceHeader from '$lib/components/pages/device/DeviceHeader.svelte';
	import DeviceEmptyState from '$lib/components/pages/device/DeviceEmptyState.svelte';
	import DeviceMetricCards from '$lib/components/pages/device/DeviceMetricCards.svelte';
	import DeviceHeatmapSection from '$lib/components/pages/device/DeviceHeatmapSection.svelte';
	import DeviceLineChartSection from '$lib/components/pages/device/DeviceLineChartSection.svelte';
	import DeviceTelemetryTableSection from '$lib/components/pages/device/DeviceTelemetryTableSection.svelte';
	import DeviceDownloadDialog from '$lib/components/pages/device/DeviceDownloadDialog.svelte';
	import type { HistoryMeta, HistoryPoint, TelemetryEntry } from '$lib/components/pages/device/logic/device-core.svelte';
	import {
		buildTrafficCsv,
		downloadCsv,
		formatDateTZ,
		getSensorMode,
		getTokyoMonthBounds,
		mapHistory
	} from '$lib/components/pages/device/logic/device-core.svelte';
	import {
		buildAirBaseMetricCards,
		buildMetricCards,
		buildSoilBaseMetricCards,
		getAlertCount,
		median,
		summarize
	} from '$lib/components/pages/device/logic/device-stats.svelte';
	import {
		buildAirHumidityChartData,
		buildAirTemperatureChartData,
		buildLineChartThresholds,
		buildSoilEcChartData,
		buildSoilMoistureChartData,
		buildSoilTemperatureChartData
	} from '$lib/components/pages/device/logic/device-line-chart.svelte';
	import {
		buildAirHeatmapSeries,
		buildHeatmapRange,
		buildSoilHeatmapSeries,
		selectHeatmapSeries
	} from '$lib/components/pages/device/logic/device-heatmap.svelte';

	const appState = getContext<AppState>('appState');
	let { data }: { data: PageData } = $props();
	const devEui = page.params.dev_eui ?? '';

	let device: Device | undefined = $derived.by(
		() => appState?.devices?.find((d: Device) => d.id === devEui)
	);
	const facilityName = $derived.by(
		() =>
			appState?.locations?.find(
				(location: { id: string; name?: string | null }) => location.id === page.params.location_id
			)?.name ?? null
	);
	const locationName = 'Freezer Aisle 01';

	let history: TelemetryEntry[] = $state([]);
	let historyMeta = $state<HistoryMeta | null>(data.historyMeta ?? null);
	const sensorMode = $derived.by(() => getSensorMode(historyMeta?.table));
	const isSoilDevice = $derived.by(() => sensorMode === 'soil');
	let historyLoading = $state(true);
	let historyError: string | null = $state(null);

	let lineDateRange: DateRangeValue = $state({
		start: new Date(Date.now() - 24 * 60 * 60 * 1000),
		end: new Date()
	});

	if (data.initialHistory?.length) {
		const initialMode = getSensorMode(data.historyMeta?.table);
		history = mapHistory(data.initialHistory, initialMode);
		historyLoading = false;
	}

	onMount(async () => {
		if (history.length) return;
		historyLoading = true;
		historyError = null;
		try {
			const { points, meta } = await fetchDeviceHistory({
				devEui,
				limit: 2000,
				hoursBack: 24
			});
			historyMeta = meta ?? null;
			const mode = getSensorMode(meta?.table);

			if (points.length) {
				history = mapHistory(points, mode);
			} else if (device && mode === 'air') {
				history = [
					{
						timestamp: device.lastSeen,
						temperature: device.temperatureC,
						humidity: device.humidity,
						co2: device.co2 ?? null,
						alert: device.hasAlert
					}
				];
			}
		} catch (err) {
			console.error(err);
			historyError = 'Unable to load historical data';
		} finally {
			historyLoading = false;
		}
	});

	const airLatestReading = $derived.by(() => {
		const latest = history[0];
		return {
			temperature: latest?.temperature ?? device?.temperatureC ?? 0,
			humidity: latest?.humidity ?? device?.humidity ?? 0,
			co2: latest?.co2 ?? device?.co2 ?? null,
			timestamp: latest?.timestamp ?? new Date().toISOString(),
			alert: latest?.alert ?? false
		};
	});

	const soilLatestReading = $derived.by(() => {
		const latest = history[0];
		return {
			temperature: latest?.temperature ?? 0,
			moisture: latest?.moisture ?? 0,
			ec: latest?.ec ?? 0,
			timestamp: latest?.timestamp ?? new Date().toISOString(),
			alert: latest?.alert ?? false
		};
	});

	const latestTimestamp = $derived.by(() =>
		isSoilDevice ? soilLatestReading.timestamp : airLatestReading.timestamp
	);

	const chronologicalHistory = $derived([...history].reverse());
	const sortedHistory = $derived(
		[...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
	);

	const temperatureValues = $derived(history.map((entry) => entry.temperature));
	const humidityValues = $derived(history.map((entry) => entry.humidity ?? 0));
	const co2Values = $derived(history.map((entry) => entry.co2 ?? 0));
	const moistureValues = $derived(history.map((entry) => entry.moisture ?? 0));
	const ecValues = $derived(history.map((entry) => entry.ec ?? 0));
	let showDownloadModal: boolean = $state<boolean>(false);

	const temperatureStats = $derived(summarize(temperatureValues));
	const humidityStats = $derived(summarize(humidityValues));
	const co2Stats = $derived(summarize(co2Values));
	const moistureStats = $derived(summarize(moistureValues));
	const ecStats = $derived(summarize(ecValues));
	const temperatureMedian = $derived(median(temperatureValues));
	const humidityMedian = $derived(median(humidityValues));
	const co2Median = $derived(median(co2Values));
	const moistureMedian = $derived(median(moistureValues));
	const ecMedian = $derived(median(ecValues));
	const readingCount = $derived(history.length);
	const airTemperatureDelta = $derived.by(() =>
		history[1] ? airLatestReading.temperature - history[1].temperature : 0
	);
	const airHumidityDelta = $derived.by(() =>
		history[1] ? airLatestReading.humidity - (history[1].humidity ?? 0) : 0
	);
	const soilTemperatureDelta = $derived.by(() =>
		history[1] ? soilLatestReading.temperature - history[1].temperature : 0
	);
	const soilMoistureDelta = $derived.by(() =>
		history[1] ? soilLatestReading.moisture - (history[1].moisture ?? 0) : 0
	);
	const soilEcDelta = $derived.by(() =>
		history[1] ? soilLatestReading.ec - (history[1].ec ?? 0) : 0
	);
	const airCo2Delta = $derived.by(() =>
		history[1] ? (history[0]?.co2 ?? 0) - (history[1]?.co2 ?? 0) : 0
	);


	const airBaseMetricCards = $derived.by(() =>
		buildAirBaseMetricCards({
			currentTemperature: airLatestReading.temperature,
			currentHumidity: airLatestReading.humidity,
			currentCo2: airLatestReading.co2 ?? 0,
			temperatureDelta: airTemperatureDelta,
			humidityDelta: airHumidityDelta,
			co2Delta: airCo2Delta,
			temperatureStats,
			humidityStats,
			co2Stats,
			temperatureMedian,
			humidityMedian,
			co2Median,
			readingCount
		})
	);

	const soilBaseMetricCards = $derived.by(() =>
		buildSoilBaseMetricCards({
			currentTemperature: soilLatestReading.temperature,
			currentMoisture: soilLatestReading.moisture,
			currentEc: soilLatestReading.ec,
			temperatureDelta: soilTemperatureDelta,
			moistureDelta: soilMoistureDelta,
			ecDelta: soilEcDelta,
			temperatureStats,
			moistureStats,
			ecStats,
			temperatureMedian,
			moistureMedian,
			ecMedian,
			readingCount
		})
	);

	const airMetricCards = $derived.by(() => buildMetricCards(airBaseMetricCards));
	const soilMetricCards = $derived.by(() => buildMetricCards(soilBaseMetricCards));
	const metricCards = $derived.by(() => (isSoilDevice ? soilMetricCards : airMetricCards));

	const alertCount = $derived(getAlertCount(history));

	// Format history data for CWLineChart
	const airTemperatureChartData = $derived(
		buildAirTemperatureChartData(chronologicalHistory)
	);

	const airHumidityChartData = $derived(buildAirHumidityChartData(chronologicalHistory));

	const soilTemperatureChartData = $derived(buildSoilTemperatureChartData(chronologicalHistory));

	const soilMoistureChartData = $derived(buildSoilMoistureChartData(chronologicalHistory));

	const soilEcChartData = $derived(buildSoilEcChartData(chronologicalHistory));

	// Thresholds use avg + 1 std deviation for contextual coloring
	const airTemperatureThreshold = $derived.by(
		() =>
			buildLineChartThresholds({ temperatureStats, moistureStats, ecStats })
				.airTemperatureThreshold
	);
	const soilTemperatureThreshold = $derived.by(
		() =>
			buildLineChartThresholds({ temperatureStats, moistureStats, ecStats })
				.soilTemperatureThreshold
	);
	const soilMoistureThreshold = $derived.by(
		() => buildLineChartThresholds({ temperatureStats, moistureStats, ecStats }).soilMoistureThreshold
	);
	const soilEcThreshold = $derived.by(
		() => buildLineChartThresholds({ temperatureStats, moistureStats, ecStats }).soilEcThreshold
	);

	const heatmapRange = $derived.by(() => buildHeatmapRange(history));
	const airHeatmapSeries = $derived.by(() => buildAirHeatmapSeries(chronologicalHistory));
	const soilHeatmapSeries = $derived.by(() => buildSoilHeatmapSeries(chronologicalHistory));
	const activeHeatmapSeries = $derived.by(() =>
		selectHeatmapSeries({ isSoilDevice, airHeatmapSeries, soilHeatmapSeries })
	);

	const airHistoryTableColumns = [
		{
			key: 'timestamp',
			label: 'Timestamp (UTC)',
			type: 'datetime' as const,
			sortable: true
		},
		{
			key: 'temperature',
			label: 'Temperature',
			type: 'number' as const,
			suffix: '°C',
			sortable: true
		},
		{
			key: 'co2',
			label: 'CO₂',
			type: 'text' as const,
			sortable: true
		},
		{
			key: 'humidity',
			label: 'Humidity',
			type: 'number' as const,
			suffix: '%',
			sortable: true
		},
		{
			key: 'alert',
			label: 'Status',
			type: 'badge' as const,
			sortable: true,
			badges: {
				true: {
					label: 'Alert',
					dotClass: 'bg-amber-400',
					badgeClass: 'bg-amber-400/20 text-amber-100'
				},
				false: {
					label: 'Normal',
					dotClass: 'bg-emerald-400',
					badgeClass: 'bg-emerald-500/10 text-emerald-200'
				}
			}
		}
	];

	const soilHistoryTableColumns = [
		{
			key: 'timestamp',
			label: 'Timestamp (UTC)',
			type: 'datetime' as const,
			sortable: true
		},
		{
			key: 'temperature',
			label: 'Soil Temperature',
			type: 'number' as const,
			suffix: '°C',
			sortable: true
		},
		{
			key: 'moisture',
			label: 'Soil Moisture',
			type: 'number' as const,
			suffix: '%',
			sortable: true
		},
		{
			key: 'ec',
			label: 'Soil EC',
			type: 'number' as const,
			suffix: 'mS/cm',
			sortable: true
		}
	];

	const historyTableColumns = $derived.by(() =>
		isSoilDevice ? soilHistoryTableColumns : airHistoryTableColumns
	);

	const airHistoryTableItems = $derived(
		sortedHistory.map((entry) => ({
			...entry,
			co2: entry.co2 != null ? entry.co2 : '—',
			alert: String(entry.alert)
		}))
	);

	const soilHistoryTableItems = $derived(
		sortedHistory.map((entry) => ({
			timestamp: entry.timestamp,
			temperature: entry.temperature,
			moisture: entry.moisture ?? 0,
			ec: entry.ec ?? 0
		}))
	);

	const historyTableItems = $derived.by(() =>
		isSoilDevice ? soilHistoryTableItems : airHistoryTableItems
	);

	const trafficRows = $derived(data.trafficRows ?? []);
	const trafficDailyTotals = $derived(data.trafficDailyTotals ?? []);
	const trafficDeviceType = $derived.by(() => {
		const raw = data.deviceType;
		return Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
	});
	const trafficDeviceLabel = $derived.by(() => {
		const name = trafficDeviceType?.name ?? '';
		const manufacturer = trafficDeviceType?.manufacturer ?? '';
		const model = trafficDeviceType?.model ?? '';
		return `${manufacturer} ${name} ${model}`.trim();
	});
	const isTrafficDevice = $derived.by(() => {
		const label = trafficDeviceLabel.toLowerCase();
		return label.includes('cropwatch') && label.includes('nvidia') && label.includes('jetson');
	});

	const trafficRange = $derived.by(() => {
		const startParam = page.url.searchParams.get('trafficStart');
		const endParam = page.url.searchParams.get('trafficEnd');
		const start = startParam ? new Date(startParam) : null;
		const end = endParam ? new Date(endParam) : null;
		if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
			return { start, end };
		}
		return getTokyoMonthBounds(new Date());
	});

	const hasRenderableData = $derived.by(
		() => Boolean(device) || history.length > 0 || trafficRows.length > 0 || !historyLoading
	);

</script>

<svelte:head>
	<title>Device Details - CropWatch Temp</title>
</svelte:head>

<!-- <pre>{JSON.stringify(device, null, 2)}</pre>
<pre>{JSON.stringify(appState, null, 2)}</pre> -->


<div class="flex flex-col gap-8 p-6 text-slate-100 overflow-x-clip">
	<DeviceActionBar
		onToggleDownload={() => (showDownloadModal = !showDownloadModal)}
		onOpenSettings={() => {
			goto(`${page.url.pathname}/settings?prev=${page.url.pathname}`);
		}}
	/>

	{#if !hasRenderableData}
		<DeviceEmptyState />
	{:else}

	<DeviceHeader
		deviceName={device?.name ?? data.deviceName ?? devEui}
		devEui={devEui}
		locationName={locationName}
		facilityName={facilityName}
		latestTimestamp={latestTimestamp}
	/>

	{#if isTrafficDevice}
		<TrafficDashboard
			rows={trafficRows}
			dailyTotals={trafficDailyTotals}
			deviceName={device?.name ?? 'Traffic camera'}
			subtitle="Monthly calendar (daily totals) · Click a day for hourly breakdown"
		/>
	{/if}

	{#if !isTrafficDevice}
	<DeviceMetricCards metricCards={metricCards} alertCount={alertCount} />
	{/if}

	{#if !isTrafficDevice}
	{#if historyLoading}
		<p class="mt-4 text-sm text-slate-400">Loading historical data…</p>
	{:else if historyError}
		<p class="mt-4 text-sm text-amber-300">{historyError}</p>
	{/if}
	{/if}

	{#if !isTrafficDevice}
	<DeviceHeatmapSection
		title={isSoilDevice ? 'Soil footprint' : 'Thermal footprint'}
		subtitle="Past 24 hours"
		metrics={activeHeatmapSeries}
		dateRange={heatmapRange}
	/>
	{/if}

	{#if !isTrafficDevice}
	<DeviceLineChartSection
		isSoilDevice={isSoilDevice}
		historyLoading={historyLoading}
		soilTemperatureChartData={soilTemperatureChartData}
		soilMoistureChartData={soilMoistureChartData}
		soilEcChartData={soilEcChartData}
		soilTemperatureThreshold={soilTemperatureThreshold}
		soilMoistureThreshold={soilMoistureThreshold}
		soilEcThreshold={soilEcThreshold}
		airTemperatureChartData={airTemperatureChartData}
		airHumidityChartData={airHumidityChartData}
		airTemperatureThreshold={airTemperatureThreshold}
		bind:lineDateRange={lineDateRange}
	/>
	{/if}

	{#if !isTrafficDevice}
	<DeviceTelemetryTableSection
		historyTableItems={historyTableItems}
		historyTableColumns={historyTableColumns}
	/>
	{/if}
	{/if}
</div>

<DeviceDownloadDialog
	bind:open={showDownloadModal}
	bind:lineDateRange={lineDateRange}
	onCancel={() => (showDownloadModal = false)}
	onDownload={() => {
		if (isTrafficDevice) {
			const normalizedRange = getTokyoMonthBounds(trafficRange.start ?? new Date());
			const csv = buildTrafficCsv(trafficRows, normalizedRange.start, normalizedRange.end);
			const safeName = (device?.name ?? devEui).replace(/\s+/g, '_');
			const filename = `traffic_${safeName}_${formatDateTZ(normalizedRange.start)}_to_${formatDateTZ(normalizedRange.end)}.csv`;
			downloadCsv(csv, filename);
		}
		showDownloadModal = false;
	}}
/>
