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
	import { _ } from 'svelte-i18n';
	import { HighChartsGuageChart } from '$lib/charts/highcharts/guage';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';

	export let data;
	export let sensorName = 'NS';
	export let permissions = 0;

	let dev_eui = data.at(0).dev_eui;
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
				name: $_('temperature'),
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperature])
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

	$: co2Config = HighChartsGuageChart(co2_level, 'CO² Level');
</script>

<div class="m-4">
	<div class="flex flex-row">
		<img
			src={isActiveRecently ? ActiveImage : inActiveImage}
			alt={isActiveRecently ? 'Active Image' : 'in-active Image'}
			class="w-14 h-14 mr-4"
		/>
		<div class="flex flex-col">
			<div class="flex flex-row text-neutral-content">
				<p class="text-surface-100 text-4xl mr-2">{sensorName}</p>
				<EditSensorNameDialog {dev_eui} bind:currentSensorName={sensorName} />
			</div>
			<p class="text-slate-500">{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} /> {$_('ago')}</p>
		</div>
	</div>

	<DarkCard title={'CO²'} value={co2_level} optimalValue={null} unit={'PPM'}>
		<div class="chart" use:Highcharts={co2Config} />
	</DarkCard>
	
	<DarkCard title={$_('temperature')} value={temperature} optimalValue={null} unit={'ºC'} />
	<DarkCard title={$_('humidity')} value={humidity} optimalValue={null} unit={'%'} />
	
	<DarkCard title={`${$_('temperature')}/${$_('humidity')}`} value={null} optimalValue={null} unit={'%'}>
		<div class="chart" use:Highcharts={tempMoistConfig} />
	</DarkCard>


	<SensorFooterControls />
</div>