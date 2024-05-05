<script lang="ts">
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import TempHumidityCard from '../TempHumidityCard.svelte';
	import DarkCard from './../DarkCard.svelte';
	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import { Duration } from 'svelte-ux';
	import SensorFooterControls from '../SensorFooterControls.svelte';

	export let data;
	export let sensorName = 'NS';

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
				name: 'Temperature',
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperatureC])
			},
			{
				type: 'line',
				yAxis: 1,
				name: 'Humidity',
				color: 'blue',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.humidity])
			}
		],
		''
	);

	$: dewPointConfig = HighChartsTimeSeriesChart([
		{
			type: 'line',
			yAxis: 0,
			name: 'Dew Point',
			color: 'red',
			data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.dewPointC])
		}
	]);
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
			<p class="text-slate-500">Last Seen: <Duration start={lastSeen} totalUnits={1} /> ago</p>
		</div>
	</div>
	<TempHumidityCard {temperature} {humidity} />
	<DarkCard title={'Temperature'} value={temperature} optimalValue={-20} unit={'ºC'} />
	<DarkCard title={'Humidity'} value={humidity} optimalValue={0} unit={'%'} />
	<DarkCard title={'Temperature/Humidity History'}>
		<div class="chart" use:Highcharts={config} />
	</DarkCard>
	<DarkCard title={'Dew Point'} value={dewPoint} optimalValue={null} unit={'ºC'}>
		<div class="chart" use:Highcharts={dewPointConfig} />
	</DarkCard>
	<DarkCard title={'VPD'} value={vpd} optimalValue={null} unit={'kPa'} />

	<SensorFooterControls />
</div>
