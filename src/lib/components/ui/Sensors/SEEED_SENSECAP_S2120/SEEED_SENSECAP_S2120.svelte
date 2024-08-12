<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import WindCompas from '../../WindCompas.svelte';
	import { degreesToDirection } from '../../utilities/degreeseToDirection';
	import { onMount } from 'svelte';
	import { createMeteogramChart } from './chart_meteogramConfig';

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


	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.humidity]);
	const temperature = sensor.data.at(0).temperatureC;
	const humidity = sensor.data.at(0).humidity;
	const windSpeed = sensor.data.at(0).wind_speed;
	const arrowRotation = sensor.data.at(0).wind_direction;
	const windDirection = degreesToDirection(arrowRotation);

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData, humidityData);
	
	let container: HTMLElement;

  onMount(() => {
    const data = {
      temperatures: sensor.data.map((d) => ({ x: new Date(d.created_at).getTime(), y: d.temperatureC })),
      precipitations: sensor.data.map((d) => ({ x: new Date(d.created_at).getTime(), y: d.humidity })),
      winds: sensor.data.map((d) => ({
        x: new Date(d.created_at).getTime(),
        value: d.wind_speed,
        direction: d.wind_direction
      })),
      pressures: sensor.data.map((d) => ({ x: new Date(d.created_at).getTime(), y: d.pressure }))
    };

    createMeteogramChart(data, container);
  });
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2">
	<DarkCard title="CO2 Level">
		<WindCompas {temperature} {humidity} {windSpeed} {windDirection} {arrowRotation} />
	</DarkCard>

	<TempHumidityCard
		temperature={sensor.data.at(-1).temperatureC}
		humidity={sensor.data.at(-1).humidity}
	/>
</div>
<DarkCard title="">
	<div bind:this={container}></div>
</DarkCard>
<DarkCard title="Temperature & Humidity">
	<div class="chart-container" use:highcharts={tempHumidChartConfig}></div>
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
