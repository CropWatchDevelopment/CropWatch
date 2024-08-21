<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import WindCompas from '../../WindCompas.svelte';
	import { degreesToDirection } from '../../utilities/degreeseToDirection';
	import { getRainfallChartConfig } from './chart_rainfall';
	import { getWindChartConfig } from './chart_windSpeed';


	export let sensor = null;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.temperatureC
	]);
	const precipitations = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.rainfall
	]);
	const wind_speed = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.wind_speed
	]);
	const wind_direction = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.wind_direction
	]);
	const pressure = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.pressure
	]);
	const lux = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.lux
	]);

	const windData = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.wind_speed,
		d.wind_direction,
	]);


	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.humidity]);
	const temperature = sensor.data.at(0).temperatureC;
	const humidity = sensor.data.at(0).humidity;
	const windSpeed = sensor.data.at(0).wind_speed;
	const arrowRotation = sensor.data.at(0).wind_direction;
	const windDirection = degreesToDirection(arrowRotation);

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData, humidityData);
	const windChartConfig = getWindChartConfig(wind_speed);
	const rainfallChartConfig = getRainfallChartConfig(precipitations);


</script>

<div class="grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2">
	<DarkCard title={$_('charts.windSpeedDirTempHumid')}>
		<WindCompas {temperature} {humidity} {windSpeed} {windDirection} {arrowRotation} />
	</DarkCard>

	<TempHumidityCard
		temperature={sensor.data.at(0).temperatureC}
		humidity={sensor.data.at(0).humidity}
	/>
</div>

<DarkCard title="Temperature & Humidity">
	<div class="chart-container" use:highcharts={tempHumidChartConfig}></div>
</DarkCard>

<DarkCard title="24h Wind Speed">
	<div class="chart-container" use:highcharts={windChartConfig}></div>
</DarkCard>

<DarkCard title="Rainfall 24h">
	<div class="chart-container" use:highcharts={rainfallChartConfig}></div>
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
