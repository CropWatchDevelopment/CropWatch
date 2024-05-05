<script lang="ts">
	import { Duration } from 'svelte-ux';
	import DarkCard from '$lib/components/ui/DarkCard.svelte';
	import SensorFooterControls from '../SensorFooterControls.svelte';
	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import moment from 'moment';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';

	export let data;
	export let sensorName = 'NS';

	let temperature = data.at(0).soil_temperatureC;
	let moisture = data.at(0).soil_moisture;
	let soil_ec = data.at(0).soil_EC;
	let lastSeen = data.at(0).created_at;
	let isActiveRecently = moment().diff(moment(lastSeen), 'minutes') < 31;

	$: tempConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: 'Temperature',
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.soil_temperatureC])
			}
		],
		'Soil Temperature'
	);

	$: moistureConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: 'Moisture',
				color: 'blue',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.soil_moisture])
			}
		],
		'Soil Moisture'
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
			<p class="text-slate-500">Last Seen: <Duration start={lastSeen} totalUnits={1} /> ago</p>
		</div>
	</div>
	<DarkCard title={'Temperature'} value={temperature} optimalValue={20} unit={'ºC'}>
		<div class="chart" use:Highcharts={tempConfig} />
		{data.length}
	</DarkCard>

	<DarkCard title={'Moisture'} value={moisture} optimalValue={40} unit={'%'}>
		<div class="chart" use:Highcharts={moistureConfig} />
	</DarkCard>

	<DarkCard title={'EC'} value={soil_ec} unit={'dS/m'} optimalValue={1}></DarkCard>

	<SensorFooterControls />
</div>
