<script lang="ts">
	import CWDateRangePicker, { type DateRangeValue } from '$lib/components/CWDateRangePicker.svelte';
	import CWLineChart from '$lib/components/CWLineChart.svelte';

	let {
		isSoilDevice,
		historyLoading,
		soilTemperatureChartData,
		soilMoistureChartData,
		soilEcChartData,
		soilTemperatureThreshold,
		soilMoistureThreshold,
		soilEcThreshold,
		airTemperatureChartData,
		airHumidityChartData,
		airTemperatureThreshold,
		lineDateRange = $bindable<DateRangeValue>()
	}: {
		isSoilDevice: boolean;
		historyLoading: boolean;
		soilTemperatureChartData: unknown[];
		soilMoistureChartData: unknown[];
		soilEcChartData: unknown[];
		soilTemperatureThreshold: number;
		soilMoistureThreshold: number;
		soilEcThreshold: number;
		airTemperatureChartData: unknown[];
		airHumidityChartData: unknown[];
		airTemperatureThreshold: number;
		lineDateRange?: DateRangeValue;
	} = $props();
</script>

<section class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
	<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
		<div>
			<p class="text-xs uppercase tracking-[0.2em] text-slate-400">Line chart</p>
			<h2 class="text-xl font-semibold text-white">
				{isSoilDevice ? 'Soil telemetry' : 'Temperature & Humidity'}
			</h2>
		</div>
		<label class="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200">
			<span class="text-xs uppercase tracking-wide text-slate-400">Range</span>
			<CWDateRangePicker maxDate={new Date()} bind:value={lineDateRange} />
		</label>
	</div>
	{#if historyLoading}
		<div class="flex items-center justify-center h-[350px] text-slate-400">
			<p>Loading chart data…</p>
		</div>
	{:else if (isSoilDevice ? soilTemperatureChartData.length === 0 : airTemperatureChartData.length === 0)}
		<div class="flex items-center justify-center h-[350px] text-slate-400">
			<p>No data available for chart</p>
		</div>
	{:else}
		{#if isSoilDevice}
			<div class="grid gap-6 lg:grid-cols-3">
				<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
					<p class="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Soil Temperature</p>
					<CWLineChart
						data={soilTemperatureChartData}
						primaryLabel="Soil Temperature"
						primaryUnit="°C"
						threshold={soilTemperatureThreshold}
						height={260}
					/>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
					<p class="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Soil Moisture</p>
					<CWLineChart
						data={soilMoistureChartData}
						primaryLabel="Soil Moisture"
						primaryUnit="%"
						threshold={soilMoistureThreshold}
						height={260}
					/>
				</div>
				<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
					<p class="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Soil EC</p>
					<CWLineChart
						data={soilEcChartData}
						primaryLabel="Soil EC"
						primaryUnit="mS/cm"
						threshold={soilEcThreshold}
						height={260}
					/>
				</div>
			</div>
		{:else}
			<CWLineChart
				data={airTemperatureChartData}
				secondaryData={airHumidityChartData}
				primaryLabel="Temperature"
				secondaryLabel="Humidity"
				primaryUnit="°C"
				secondaryUnit="%"
				threshold={airTemperatureThreshold}
				height={350}
			/>
		{/if}
	{/if}
</section>
