<script lang="ts">
	import Highcharts from '$lib/actions/highcharts.action';
	import { PeriodType } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { subDays } from 'date-fns';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import { getChartConfig } from './chart_tempHumidityConfig';

	export let sensor;

	const temperature = sensor.data.at(0).temperatureC;
	const humidity = sensor.data.at(0).humidity;
	const temperatureData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.temperatureC]);
	const humidityData = sensor.data.map((d) => [new Date(d.created_at).getTime(), d.humidity]);

	const chartConfig = getChartConfig(temperatureData,humidityData);

	
</script>

<TempHumidityCard {temperature} {humidity} />

{#key sensor}
	{#if chartConfig}
		<DarkCard title="24h {$_('temperatureC')}/{$_('humidity')}">
			<div class="chart" use:Highcharts={chartConfig} />
		</DarkCard>
		
		<!-- <DarkCard title="24h {$_('dewPointC')}">
			<div class="chart" use:Highcharts={dewPointConfig} />
		</DarkCard> -->
	{/if}
{/key}