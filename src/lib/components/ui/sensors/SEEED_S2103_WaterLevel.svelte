<script lang="ts">
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import TempHumidityCard from '../TempHumidityCard.svelte';
	import DarkCard from './../DarkCard.svelte';
	import { DateRangeField, PeriodType } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { subDays } from 'date-fns';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import CircleNumber from '../CircleNumber.svelte';

	export let data;
    // Upload payload: 3110010000001A80000000
    // On Port 3

	let dev_eui = $page.params.dev_eui;
	const water_level = data.at(0).water_level;

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
					data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.water_level/1000])
				},
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
						format: '{value}m',
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

{#key data}
	{#if config}
		<CircleNumber value={(water_level/1000).toFixed(2)} notation={'m'} />
		<DarkCard title={$_('water_level')}>
			<div class="chart mt-2" use:Highcharts={config} />
		</DarkCard>
	{/if}
{/key}