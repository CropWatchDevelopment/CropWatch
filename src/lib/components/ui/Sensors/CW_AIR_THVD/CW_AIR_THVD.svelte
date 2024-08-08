<script lang="ts">
	import Highcharts from '$lib/actions/highcharts.action';
	import { PeriodType } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { subDays } from 'date-fns';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';

	export let data;

	let dev_eui = data.at(0).dev_eui;
	const temperature = data.at(0).temperatureC;
	const humidity = data.at(0).humidity;

	let today = new Date();
	let value = {
		from: subDays(today, 1),
		to: today,
		periodType: PeriodType.Day
	};

	let config: any | null = null;
	let dewPointConfig: any | null = null;

	

	
</script>

<TempHumidityCard {temperature} {humidity} />

{#key data}
	{#if config}
		<DarkCard title="24h {$_('temperatureC')}/{$_('humidity')}">
			<div class="chart" use:Highcharts={config} />
		</DarkCard>
		
		<DarkCard title="24h {$_('dewPointC')}">
			<div class="chart" use:Highcharts={dewPointConfig} />
		</DarkCard>
	{/if}
{/key}