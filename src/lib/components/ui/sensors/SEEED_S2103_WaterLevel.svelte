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
	const water_level = data.at(0).water_level > 0 ? data.at(0).water_level : 0;

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
					data: data.map((d: any) => [new Date(d.created_at).valueOf(), getWaterLevel(d.water_level / 1000)])
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

	function getWaterLevel(voltage: number) {
		if (voltage < 0.5) return 0;
		if (voltage > 4.5) return 5;

		if (voltage >= 0.5 && voltage < 1.3) {
			return ((voltage - 0.5) / (1.3 - 0.5)) * (1 - 0) + 0;
		} else if (voltage >= 1.3 && voltage < 2.1) {
			return ((voltage - 1.3) / (2.1 - 1.3)) * (2 - 1) + 1;
		} else if (voltage >= 2.1 && voltage < 2.9) {
			return ((voltage - 2.1) / (2.9 - 2.1)) * (3 - 2) + 2;
		} else if (voltage >= 2.9 && voltage < 3.7) {
			return ((voltage - 2.9) / (3.7 - 2.9)) * (4 - 3) + 3;
		} else if (voltage >= 3.7 && voltage < 4.5) {
			return ((voltage - 3.7) / (4.5 - 3.7)) * (5 - 4) + 4;
		} else {
			return 5; // In case the voltage is exactly 4.5V
		}
	}

	onMount(() => {
		filterDataByDate({ detail: value });
	});
</script>

{#key data}
	{#if config}
		<CircleNumber value={getWaterLevel(water_level).toFixed(2)} notation={'m'} />
		<DarkCard title={$_('water_level')}>
			<div class="chart mt-2" use:Highcharts={config} />
		</DarkCard>
	{/if}
{/key}
