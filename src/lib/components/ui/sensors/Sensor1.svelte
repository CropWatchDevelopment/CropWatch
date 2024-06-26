<script lang="ts">
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import TempHumidityCard from '../TempHumidityCard.svelte';
	import DarkCard from './../DarkCard.svelte';
	import { DateRangeField, PeriodType } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { subDays } from 'date-fns';

	export let data;

	let dev_eui = data.at(0).dev_eui;
	const temperature = data.at(0).temperatureC;
	const humidity = data.at(0).humidity;
	const vpd = data.at(0).vpd;
	const lastSeen: Date = data.at(0).created_at;

	let today = new Date();
	let value = {
		from: subDays(today, 3),
		to: today,
		periodType: PeriodType.Day
	};

	let config = null;

	const filterDataByDate = (e) => {
		config = null;
		value = e.detail;
		fetch(
			`/api/v1/devices/${dev_eui}/data?from=${value.from.toISOString()}&to=${value.to.toISOString()}`
		)
			.then((res) => res.json())
			.then((data) => {
				data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
				data = data;
				config = HighChartsTimeSeriesChart(
					[
						{
							type: 'line',
							yAxis: 0,
							name: $_('temperatureC'),
							color: 'red',
							data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperatureC])
						},
						{
							type: 'line',
							yAxis: 1,
							name: $_('humidity'),
							color: 'lightblue',
							data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.humidity])
						}
					],
					[
						{
							// Secondary yAxis
							title: {
								text: '',
								style: {
									color: 'red'
								}
							},
							labels: {
								format: '{value} °C',
								style: {
									color: 'red'
								}
							},
							opposite: false
						},
						{
							// Secondary yAxis
							title: {
								text: '',
								style: {
									color: 'lightblue'
								}
							},
							labels: {
								format: '{value} %',
								style: {
									color: 'lightblue'
								}
							},
							opposite: true
						}
					],
					`${$_('temperatureC')}/${$_('humidity')}`
				);
			});
	};


	$: dewPointConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: $_('dewPointC'),
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.dewPointC])
			}
		],
		[
			{
				// Secondary yAxis
				title: {
					text: '',
					style: {
						color: 'red'
					}
				},
				labels: {
					format: '{value} °C',
					style: {
						color: 'red'
					}
				},
				opposite: false
			}
		],
		''
	);
</script>



	<TempHumidityCard {temperature} {humidity} />

	<DateRangeField
		periodTypes={[]}
		label=""
		maxDate={new Date()}
		on:change={(e) => filterDataByDate(e)}
		bind:value
		size="lg"
		stepper
		rounded
		center
		class="w-full"
	/>

	<h1 class="text-white my-5">{$_('temperatureC')}/{$_('humidity')}</h1>

	{#key data}
	{#if config}
	<div class="chart" use:Highcharts={config} />
	<h1 class="text-white my-3">{$_('dewPointC')}</h1>
	<div class="chart" use:Highcharts={dewPointConfig} />
		{/if}
	{/key}

	<DarkCard title={$_('vpd')} value={vpd} optimalValue={null} unit={'kPa'} />

