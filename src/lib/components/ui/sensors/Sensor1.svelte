<script lang="ts">
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import TempHumidityCard from '../TempHumidityCard.svelte';
	import DarkCard from './../DarkCard.svelte';
	import { DateRangeField, PeriodType } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { subDays } from 'date-fns';
	import { onMount } from 'svelte';
	import DarkCard2 from '../DarkCard2.svelte';

	export let data;

	let dev_eui = data.at(0).dev_eui;
	const temperature = data.at(0).temperatureC;
	const humidity = data.at(0).humidity;
	const vpd = data.at(0).vpd;

	let today = new Date();
	let value = {
		from: subDays(today, 1),
		to: today,
		periodType: PeriodType.Day
	};

	let config: any | null = null;
	let dewPointConfig: any | null = null;

	const fetchData = (from, to) => {
		return fetch(
			`/api/v1/devices/${dev_eui}/data?from=${from.toISOString()}&to=${to.toISOString()}&noLimit=1`
		)
			.then((res) => res.json())
			.then((data) => {
				data.sort(
					(a: Date, b: Date) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf()
				);
				return data;
			});
	};

	const updateCharts = (data) => {
		config = HighChartsTimeSeriesChart(
			[
				{
					type: 'line',
					yAxis: 0,
					name: $_('temperatureC'),
					color: '#ffdd00',
					data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperatureC])
				},
				{
					type: 'line',
					yAxis: 1,
					name: $_('humidity'),
					color: '#91fbfc',
					data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.humidity])
				}
			],
			[
				{
					// Secondary yAxis
					title: {
						text: '',
						style: {
							color: '#ffdd00'
						}
					},
					labels: {
						format: '{value} °C',
						style: {
							color: '#ffdd00',
							'font-size': '17px',
							'font-weight': 'bold'
						}
					},
					opposite: false
				},
				{
					// Secondary yAxis
					title: {
						text: '',
						style: {
							color: '#91fbfc'
						}
					},
					labels: {
						format: '{value} %',
						style: {
							color: '#91fbfc',
							'font-size': '17px',
							'font-weight': 'bold'
						}
					},
					opposite: true
				}
			],
			``
		);

		dewPointConfig = HighChartsTimeSeriesChart(
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
	};

	const filterDataByDate = (e) => {
		config = null;
		dewPointConfig = null;
		value = e.detail;
		fetchData(value.from, value.to).then((data) => {
			updateCharts(data);
		});
	};

	onMount(() => {
		filterDataByDate({ detail: value });
	});
</script>

<TempHumidityCard {temperature} {humidity} />

<DateRangeField
	periodTypes={[]}
	label=""
	maxDate={Date}
	on:change={(e) => filterDataByDate(e)}
	bind:value
	size="lg"
	stepper
	rounded
	center
	class="w-full"
/>


{#key data}
	{#if config}
		<DarkCard title={$_('temperatureC')}/{$_('humidity')}>
			<div class="chart mt-2" use:Highcharts={config} />
		</DarkCard>
		<h1 class="text-white my-3">{$_('dewPointC')}</h1>
		<DarkCard>
			<div class="chart" use:Highcharts={dewPointConfig} />
		</DarkCard>
	{/if}
{/key}

<DarkCard title={$_('vpd')} value={vpd} optimalValue={null} unit={'kPa'} />
