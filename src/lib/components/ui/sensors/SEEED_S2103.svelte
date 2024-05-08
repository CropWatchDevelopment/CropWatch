<script lang="ts">
	import { Duration } from 'svelte-ux';
	import DarkCard from '$lib/components/ui/DarkCard.svelte';
	import SensorFooterControls from '../SensorFooterControls.svelte';
	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import moment from 'moment';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import { curveLinearClosed } from 'd3-shape';
	import { Chart, Svg, Group, LinearGradient, Arc, Text } from 'layerchart';
	import { HighChartsGuageChart } from '$lib/charts/highcharts/guage';

	export let data;
	export let sensorName = 'NS';
	export let permissions = 0;

	let temperature = data.at(0).temperature;
	let humidity = data.at(0).humidity;
	let co2_level = data.at(0).co2_level;

	let lastSeen = data.at(0).created_at;
	let isActiveRecently = moment().diff(moment(lastSeen), 'minutes') < 61;
	let curve = curveLinearClosed;

	$: tempMoistConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: 'Temperature',
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperature])
			},
			{
				type: 'line',
				yAxis: 0,
				name: 'Moisture',
				color: 'blue',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.humidity])
			}
		],
		'Soil Temperature'
	);

	$: co2Config = HighChartsGuageChart(co2_level, 'CO2 Level');
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

	<DarkCard title={'CO2'} value={co2_level} optimalValue={null} unit={'PPM'}>
		<div class="chart" use:Highcharts={co2Config} />
	</DarkCard>

	<DarkCard title={'Temperature/Humidity'} value={null} optimalValue={null} unit={'%'}>
		<div class="chart" use:Highcharts={tempMoistConfig} />
	</DarkCard>

	<DarkCard title={'Temperature'} value={temperature} optimalValue={null} unit={'ºC'} />
	<DarkCard title={'Humidity'} value={humidity} optimalValue={null} unit={'%'} />

	<SensorFooterControls />
</div>
