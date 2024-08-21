<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import { getGaugeChartConfig } from './chart_co2Config';
	import { getCo2ChartConfig } from './chart_co2LineConfig';
	import DarkCard from '../../Cards/DarkCard.svelte';

	export let sensor = null;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.temperature]);
	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.humidity]);
	const co2Data = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.co2_level]);
	const Current_co2_level = sensor.data.at(0).co2_level;

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData, humidityData);
	const co2ChartConfig = getGaugeChartConfig(Current_co2_level, 'CO2 PPM', 'ppm');
	const getCo2lineConfig = getCo2ChartConfig(co2Data);
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2 {Current_co2_level !== null ? 'md:grid-cols-2' : ''}">
	{#if Current_co2_level}
		<DarkCard>
			<div class="chart-container my-auto" use:highcharts={co2ChartConfig} />
		</DarkCard>
	{/if}
	<TempHumidityCard
		temperature={sensor.data.at(0).temperature}
		humidity={sensor.data.at(0).humidity}
	/>
</div>
{#if Current_co2_level}
<DarkCard title="{$_('charts.co2')}/24h">
	<div class="chart-container my-auto" use:highcharts={getCo2lineConfig} />
</DarkCard>
{/if}
<DarkCard title="{$_('charts.tempHumidity')}/24h">
	<div class="chart-container" use:highcharts={tempHumidChartConfig} />
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
