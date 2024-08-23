<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import DarkCard from '../../Cards/DarkCard.svelte';

	export let sensor = null;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.temperature]);
	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.humidity]);
	const current_temp = sensor.data.at(0).temperature;
	const current_humidity = sensor.data.at(0).humidity;


	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData, humidityData);
</script>


<DarkCard title="{$_('charts.tempHumidity')}/24h">
	<div class="chart-container" use:highcharts={tempHumidChartConfig} />
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
