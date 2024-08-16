<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import { getChartConfig } from './chart_tempConfig';
	import moment from 'moment';

	export let sensor = null;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.temperatureC]);
    const temp = sensor.data.at(0).temperatureC;
	const time = new Date(sensor.data.at(0).created_at)
	debugger;

	// Get Highcharts configuration
	const tempChartConfig = getChartConfig(temperatureData);
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2">
	<TempHumidityCard
		temperature={temp}
		humidity={null}
	/>
</div>
<DarkCard title="Temperature & Humidity">
	<div class="chart-container" use:highcharts={tempChartConfig}></div>
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
