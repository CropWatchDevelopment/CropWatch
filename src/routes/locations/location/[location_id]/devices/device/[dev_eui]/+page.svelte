<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import type { DateRangeValue } from '$lib/components/CWDateRangePicker.svelte';
	import DeviceActionBar from '$lib/components/pages/device/DeviceActionBar.svelte';
	import DeviceDownloadDialog from '$lib/components/pages/device/DeviceDownloadDialog.svelte';
	import DeviceEmptyState from '$lib/components/pages/device/DeviceEmptyState.svelte';
	import DeviceHeader from '$lib/components/pages/device/DeviceHeader.svelte';
	import {
		buildSensorCsv,
		buildTrafficCsv,
		downloadCsv,
		formatDateTZ,
		getSensorMode,
		getTokyoBoundsFromDateRange,
		getTokyoMonthBounds,
		mapHistory,
		type HistoryMeta,
		type HistoryPoint,
		type TelemetryEntry
	} from '$lib/components/pages/device/logic/device-core.svelte';
	import TrafficDashboard from '$lib/components/traffic/TrafficDashboard.svelte';
	import { useAppState } from '$lib/data/AppState.svelte';
	import { fetchDeviceHistory } from '$lib/data/SourceOfTruth.svelte';
	import type { PageData } from './$types';
	import SensorDeviceContent from './SensorDeviceContent.svelte';
	import { buildDeviceTelemetryViewModel } from './device-telemetry';
	import {
		buildTrafficDeviceLabel,
		isTrafficDeviceLabel,
		normalizeTrafficDeviceType,
		resolveTrafficRange
	} from './device-traffic';

	const getAppState = useAppState();
	let appState = $derived(getAppState());

	let { data }: { data: PageData } = $props();
	const devEui = page.params.dev_eui ?? '';

	const facilityName = $derived.by(
		() =>
			appState?.locations?.find(
				(location: { id: string; name?: string | null }) => location.id === page.params.location_id
			)?.name ?? null
	);
	const locationName = $derived(
		appState?.locations?.find((location) => location.id === page.params.location_id)?.name ?? 'N/A'
	);

	let history: TelemetryEntry[] = $state([]);
	let historyMeta = $state<HistoryMeta | null>(null);
	const sensorMode = $derived.by(() => getSensorMode(historyMeta?.table));
	const isSoilDevice = $derived.by(() => sensorMode === 'soil');
	let historyLoading = $state(true);
	let historyError: string | null = $state(null);
	let showDownloadModal = $state(false);

	let lineDateRange: DateRangeValue = $state({
		start: new Date(Date.now() - 24 * 60 * 60 * 1000),
		end: new Date()
	});

	const toHistoryMeta = (value: unknown): HistoryMeta | null => {
		if (!value || typeof value !== 'object') return null;
		const record = value as Record<string, unknown>;
		return {
			table: typeof record.table === 'string' ? record.table : null,
			primaryKey: typeof record.primaryKey === 'string' ? record.primaryKey : null,
			secondaryKey: typeof record.secondaryKey === 'string' ? record.secondaryKey : null
		};
	};

	const hydrateFromServerData = () => {
		const initialMeta = toHistoryMeta(data.historyMeta);
		historyMeta = initialMeta;
		if (!data.initialHistory?.length) return;
		const initialMode = getSensorMode(initialMeta?.table);
		history = mapHistory(data.initialHistory, initialMode);
		historyLoading = false;
	};

	hydrateFromServerData();

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
			const normalizedMeta = toHistoryMeta(meta);
			historyMeta = normalizedMeta;
			const mode = getSensorMode(normalizedMeta?.table);
			if (points.length) {
				history = mapHistory(points, mode);
			}
		} catch (error) {
			console.error(error);
			historyError = 'Unable to load historical data';
		} finally {
			historyLoading = false;
		}
	});

	const telemetry = $derived.by(() => buildDeviceTelemetryViewModel(history, isSoilDevice));

	const trafficRows = $derived((data.trafficRows ?? []).filter((row) => row.dev_eui === devEui));
	const trafficDeviceType = $derived.by(() => normalizeTrafficDeviceType(data.deviceType as any));
	const trafficDeviceLabel = $derived.by(() => buildTrafficDeviceLabel(trafficDeviceType));
	const isTrafficDevice = $derived.by(() => isTrafficDeviceLabel(trafficDeviceLabel));
	const trafficRange = $derived.by(() => resolveTrafficRange(page.url.searchParams));

	const hasRenderableData = $derived.by(
		() => history.length > 0 || trafficRows.length > 0 || !historyLoading
	);

	const openDeviceSettings = () => {
		goto(`${page.url.pathname}/settings?prev=${page.url.pathname}`);
	};

	const downloadTrafficReport = () => {
		const normalizedRange = getTokyoMonthBounds(trafficRange.start ?? new Date());
		const csv = buildTrafficCsv(trafficRows, normalizedRange.start, normalizedRange.end);
		const safeName = (data.deviceName ?? devEui).replace(/\s+/g, '_');
		const filename = `traffic_${safeName}_${formatDateTZ(normalizedRange.start)}_to_${formatDateTZ(normalizedRange.end)}.csv`;
		downloadCsv(csv, filename);
	};

	const downloadSensorReport = async () => {
		const oldestHistory = history[history.length - 1];
		const newestHistory = history[0];
		const fallbackStart = oldestHistory
			? new Date(oldestHistory.timestamp)
			: new Date(Date.now() - 24 * 60 * 60 * 1000);
		const fallbackEnd = newestHistory ? new Date(newestHistory.timestamp) : new Date();
		const normalizedRange = getTokyoBoundsFromDateRange(lineDateRange, {
			start: fallbackStart,
			end: fallbackEnd
		});
		let downloadMode = sensorMode;
		let downloadHistory = history;

		try {
			const params = new URLSearchParams({
				raw: '1',
				start: normalizedRange.start.toISOString(),
				end: normalizedRange.end.toISOString(),
				limit: '10000'
			});
			const response = await fetch(
				`/api/private/devices/${encodeURIComponent(devEui)}/history?${params.toString()}`
			);
			if (!response.ok) {
				throw new Error(`History request failed with status ${response.status}`);
			}
			const payload = (await response.json()) as {
				success?: boolean;
				error?: string;
				points?: HistoryPoint[];
				meta?: unknown;
			};
			if (!payload.success) {
				throw new Error(payload.error ?? 'Download history request failed');
			}
			const points: HistoryPoint[] = Array.isArray(payload.points) ? payload.points : [];
			const normalizedMeta = toHistoryMeta(payload.meta);
			downloadMode = getSensorMode(normalizedMeta?.table ?? historyMeta?.table);
			downloadHistory = mapHistory(points, downloadMode);
		} catch (error) {
			console.error('Unable to refresh range-specific history for download:', error);
		}

		const csv = buildSensorCsv(
			downloadHistory,
			downloadMode,
			normalizedRange.start,
			normalizedRange.end
		);
		const safeName = (data.deviceName ?? devEui).replace(/\s+/g, '_');
		const filename = `telemetry_${downloadMode}_${safeName}_${formatDateTZ(normalizedRange.start)}_to_${formatDateTZ(normalizedRange.end)}.csv`;
		downloadCsv(csv, filename);
	};
</script>

<svelte:head>
	<title>Device Details - CropWatch Temp</title>
</svelte:head>

<div class="flex flex-col gap-8 overflow-x-clip p-6 text-slate-100">
	<DeviceActionBar
		onToggleDownload={() => (showDownloadModal = !showDownloadModal)}
		onOpenSettings={openDeviceSettings}
	/>

	{#if !hasRenderableData}
		<DeviceEmptyState />
	{:else}
		<DeviceHeader
			deviceName={data.deviceName ?? devEui}
			{devEui}
			{locationName}
			{facilityName}
			latestTimestamp={telemetry.latestTimestamp}
		/>

		{#if isTrafficDevice}
			<TrafficDashboard
				rows={trafficRows}
				dailyTotals={data.trafficDailyTotals ?? []}
				deviceName={data.deviceName ?? 'Traffic camera'}
				subtitle="Monthly calendar (daily totals) · Click a day for hourly breakdown"
			/>
		{:else}
			<SensorDeviceContent
				{isSoilDevice}
				metricCards={telemetry.metricCards}
				alertCount={telemetry.alertCount}
				{historyLoading}
				{historyError}
				activeHeatmapSeries={telemetry.activeHeatmapSeries}
				heatmapRange={telemetry.heatmapRange}
				soilTemperatureChartData={telemetry.soilTemperatureChartData}
				soilMoistureChartData={telemetry.soilMoistureChartData}
				soilEcChartData={telemetry.soilEcChartData}
				soilTemperatureThreshold={telemetry.soilTemperatureThreshold}
				soilMoistureThreshold={telemetry.soilMoistureThreshold}
				soilEcThreshold={telemetry.soilEcThreshold}
				airTemperatureChartData={telemetry.airTemperatureChartData}
				airHumidityChartData={telemetry.airHumidityChartData}
				airTemperatureThreshold={telemetry.airTemperatureThreshold}
				historyTableItems={telemetry.historyTableItems}
				historyTableColumns={telemetry.historyTableColumns}
				bind:lineDateRange
			/>
		{/if}
	{/if}
</div>

<DeviceDownloadDialog
	bind:open={showDownloadModal}
	bind:lineDateRange
	onCancel={() => (showDownloadModal = false)}
	onDownload={async () => {
		if (isTrafficDevice) {
			downloadTrafficReport();
		} else {
			await downloadSensorReport();
		}
		showDownloadModal = false;
	}}
/>
