<script lang="ts">
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import TempHumidityCard from '../TempHumidityCard.svelte';
	import DarkCard from './../DarkCard.svelte';
	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import { Duration } from 'svelte-ux';
	import SensorFooterControls from '../SensorFooterControls.svelte';
	import { _ } from 'svelte-i18n';

	export let data;
	export let sensorName = 'NS';
	export let permissions = 0;

	const temperature = data.at(0).temperatureC;
	const humidity = data.at(0).humidity;
	const dewPoint = data.at(0).dewPointC;
	const vpd = data.at(0).vpd;
	const lastSeen: Date = data.at(0).created_at;
	const isActiveRecently = true;

	$: config = HighChartsTimeSeriesChart(
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
					text: $_('temperature'),
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
					text: $_('humidity'),
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
		''
	);

	$: dewPointConfig = HighChartsTimeSeriesChart([
		{
			type: 'line',
			yAxis: 0,
			name: $_('dewPointC'),
			color: 'red',
			data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.dewPointC])
		}],
		[
			{
				// Secondary yAxis
				title: {
					text: $_('dewPointC'),
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

<div class="m-4">
	<div class="flex flex-row">
		<img
			src={isActiveRecently ? ActiveImage : inActiveImage}
			alt={isActiveRecently ? 'Active Image' : 'in-active Image'}
			class="w-14 h-14 mr-4"
		/>
		<div class="flex flex-col">
			<p class="text-surface-100 text-4xl">{sensorName}</p>
			<p class="text-slate-500">{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} /> {$_('ago')}</p>
		</div>
	</div>
	<TempHumidityCard {temperature} {humidity} />
	<DarkCard title={$_('temperature')} value={temperature} optimalValue={-20} unit={'ºC'} />
	<DarkCard title={$_('humidity')} value={humidity} optimalValue={0} unit={'%'} />
	<DarkCard title={$_('temp_humidity')}>
		<div class="chart" use:Highcharts={config} />
	</DarkCard>
	<DarkCard title={$_('dewPointC')} value={dewPoint} optimalValue={null} unit={'ºC'}>
		<div class="chart" use:Highcharts={dewPointConfig} />
	</DarkCard>
	<DarkCard title={$_('vpd')} value={vpd} optimalValue={null} unit={'kPa'} />

	<SensorFooterControls {permissions} />
</div>
