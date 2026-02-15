<script lang="ts">
	import type { DateRangeValue } from '$lib/components/CWDateRangePicker.svelte';
	import type { ColumnConfig } from '$lib/components/cw-table/types';
	import type { MetricCardScaled } from '$lib/components/pages/device/logic/device-stats.svelte';
	import DeviceHeatmapSection from '$lib/components/pages/device/DeviceHeatmapSection.svelte';
	import DeviceLineChartSection from '$lib/components/pages/device/DeviceLineChartSection.svelte';
	import DeviceMetricCards from '$lib/components/pages/device/DeviceMetricCards.svelte';
	import DeviceTelemetryTableSection from '$lib/components/pages/device/DeviceTelemetryTableSection.svelte';

	let {
		isSoilDevice,
		metricCards,
		alertCount,
		historyLoading,
		historyError,
		activeHeatmapSeries,
		heatmapRange,
		soilTemperatureChartData,
		soilMoistureChartData,
		soilEcChartData,
		soilTemperatureThreshold,
		soilMoistureThreshold,
		soilEcThreshold,
		airTemperatureChartData,
		airHumidityChartData,
		airTemperatureThreshold,
		historyTableItems,
		historyTableColumns,
		lineDateRange = $bindable<DateRangeValue>()
	}: {
		isSoilDevice: boolean;
		metricCards: MetricCardScaled[];
		alertCount: number;
		historyLoading: boolean;
		historyError: string | null;
		activeHeatmapSeries: unknown;
		heatmapRange: string;
		soilTemperatureChartData: unknown[];
		soilMoistureChartData: unknown[];
		soilEcChartData: unknown[];
		soilTemperatureThreshold: number;
		soilMoistureThreshold: number;
		soilEcThreshold: number;
		airTemperatureChartData: unknown[];
		airHumidityChartData: unknown[];
		airTemperatureThreshold: number;
		historyTableItems: unknown[];
		historyTableColumns: ColumnConfig[];
		lineDateRange?: DateRangeValue;
	} = $props();
</script>

<DeviceMetricCards {metricCards} {alertCount} />

{#if historyLoading}
	<p class="mt-4 text-sm text-slate-400">Loading historical data…</p>
{:else if historyError}
	<p class="mt-4 text-sm text-amber-300">{historyError}</p>
{/if}

<DeviceHeatmapSection
	title={isSoilDevice ? 'Soil footprint' : 'Thermal footprint'}
	subtitle="Past 24 hours"
	metrics={activeHeatmapSeries}
	dateRange={heatmapRange}
/>

<DeviceLineChartSection
	{isSoilDevice}
	{historyLoading}
	{soilTemperatureChartData}
	{soilMoistureChartData}
	{soilEcChartData}
	{soilTemperatureThreshold}
	{soilMoistureThreshold}
	{soilEcThreshold}
	{airTemperatureChartData}
	{airHumidityChartData}
	{airTemperatureThreshold}
	bind:lineDateRange
/>

<DeviceTelemetryTableSection {historyTableItems} {historyTableColumns} />
