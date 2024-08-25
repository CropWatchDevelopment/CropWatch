<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import { nameToEmoji } from '../../utilities/NameToEmoji';
	import { getNPKChartConfig } from './chart_npkConfig';
	import { getPHChartConfig } from './chart_phConfig';
	import { Radio } from 'svelte-ux';

	export let sensor = null;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => [
		new Date(d.created_at).getTime(),
		d.soil_temperature
	]);
	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.soil_humidity]);
	const current_temp = sensor.data.at(0).soil_temperature;
	const current_humidity = sensor.data.at(0).soil_humidity;
	const soil_n = sensor.data.at(0).soil_n;
	const soil_k = sensor.data.at(0).soil_k;
	const soil_p = sensor.data.at(0).soil_p;
	const current_ph = sensor.data.at(0).soil_ph;
	let current_ec = sensor.data.at(0).soil_ec; // in µS/cm

	let ecNotationType = 1;

	// Function to convert EC based on selected notation type
	const convertEC = (ecValue: number, notationType: number) => {
		switch (notationType) {
			case 1:
				// µS/cm (default)
				return ecValue;
			case 2:
				// dS/m (1 dS/m = 1000 µS/cm)
				return ecValue / 1000;
			default:
				return ecValue;
		}
	};

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData, humidityData);
	const npkChartConfig = getNPKChartConfig(soil_n, soil_p, soil_k);
	const phChartConfig = getPHChartConfig(current_ph);
</script>

<div class="grid grid-cols-1 gap-2 md:grid-cols-2">
	<DarkCard
		title="{nameToEmoji('temperature')}{$_('soil_temperature')}"
		value={current_temp}
		unit="°C"
		optimalValue={25}
	/>
	<DarkCard title="💧{$_('soil_moisture')}" value={current_humidity} unit="%" optimalValue={40} />
</div>

<DarkCard title="24h {$_('charts.tempMoisture')}">
	<div class="chart-container" use:highcharts={tempHumidChartConfig} />
</DarkCard>

<div class="grid grid-cols-1 gap-2 md:grid-cols-3">
	<div>
		<DarkCard>
			<h1>NPK</h1>
			<div class="chart-container" use:highcharts={npkChartConfig} />
			<div class="flex w-full flex-row justify-center gap-5">
				<p class="text-center">
					<span class="text-green-500">N</span>: {soil_n}mg/kg
				</p>
				<p class="text-center">
					<span class="text-red-500">P</span>: {soil_p}mg/kg
				</p>
				<p class="text-center">
					<span class="text-yellow-500">K</span>: {soil_k}mg/kg
				</p>
			</div>
		</DarkCard>
	</div>

	<DarkCard>
		<h1>pH</h1>
		<div class="chart-container" use:highcharts={phChartConfig} />
	</DarkCard>

	<DarkCard>
		<h1>EC</h1>
		<!-- Apply flexbox directly here to center the content -->
		<div class="flex flex-1 flex-col justify-center items-center" style="min-height: 150px;">
			<p id="EC" class="text-5xl">
				{convertEC(current_ec, ecNotationType)}
				{ecNotationType == 1 ? 'µS/cm' : 'dS/m'}
			</p>
			<div class="mt-4 flex flex-row gap-4">
				<Radio name="label" bind:group={ecNotationType} value={1}>µS/cm</Radio>
				<Radio name="label" bind:group={ecNotationType} value={2}>dS/m</Radio>
			</div>
		</div>
	</DarkCard>
	
	
</div>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
