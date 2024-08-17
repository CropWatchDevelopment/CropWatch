<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import { getGaugeChartConfig } from './chart_co2Config';
	import DarkCard from '../../Cards/DarkCard.svelte';

	export let sensor = null;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.temperature]);
	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.humidity]);
    const co2_level = sensor.data.at(-1).co2_level;

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData, humidityData);
	const co2ChartConfig = getGaugeChartConfig(co2_level, 'CO2 Level', 'ppm');
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2 { co2_level !== null ? 'md:grid-cols-2' : '' }">
	{#if co2_level}
		<DarkCard title="CO2 Level">
			<div class="chart-container" use:highcharts={co2ChartConfig}></div>
		</DarkCard>
	{/if}
	<TempHumidityCard
		temperature={sensor.data.at(0).temperature}
		humidity={sensor.data.at(0).humidity}
	/>
</div>
<DarkCard title="Temperature & Humidity">
	<div class="chart-container" use:highcharts={tempHumidChartConfig}></div>
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
