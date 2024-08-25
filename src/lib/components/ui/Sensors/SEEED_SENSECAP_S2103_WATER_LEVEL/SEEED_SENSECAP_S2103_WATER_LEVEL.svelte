<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import { getChartConfig } from './chart_waterLevelConfig';

	export let sensor = null;

	// Prepare data for the chart
	const waterLevel = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.water_level]);
    const curentWaterLevel = (sensor.data.at(0).water_level).toFixed(2)

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(waterLevel);
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2">
	<TempHumidityCard temperature={curentWaterLevel} temperatureNotation='m' humidity={null}
	/>
</div>
<DarkCard title="24h {$_('devices.waterLevel')}">
	<div class="chart-container" use:highcharts={tempHumidChartConfig}></div>
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
