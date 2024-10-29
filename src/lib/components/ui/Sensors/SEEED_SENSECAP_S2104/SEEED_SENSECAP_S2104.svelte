<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import { nameToEmoji } from '../../utilities/NameToEmoji';

	export let sensor = null;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.temperature
	]);
	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.moisture]);
	const current_temp = sensor.data.at(0).temperature;
	const current_humidity = sensor.data.at(0).moisture;

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData, humidityData);
</script>

<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
	<DarkCard
		title="{nameToEmoji('temperature')}{$_('soil_temperature')}"
		value={current_temp}
		unit="°C"
	/>
	<DarkCard title="💧{$_('soil_moisture')}" value={current_humidity} unit="%" />
</div>

<DarkCard title="24h {$_('charts.tempMoisture')}">
	<div class="chart-container" use:highcharts={tempHumidChartConfig} />
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
