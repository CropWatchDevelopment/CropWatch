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
	import TempHumidityCard from '../TempHumidityCard.svelte';

	export let data;

	// let dev_eui = data.at(0).dev_eui;
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

	$: co2GraphConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: 'CO2',
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.co2_level])
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
					format: '{value} PPM',
					style: {
						color: 'red'
					}
				},
				opposite: false
			}
		],
		''
	);

	$: co2Config = HighChartsGuageChart(co2_level, 'CO² Level');
</script>

<DarkCard title={''} value={null} optimalValue={null} unit={null}>
	<div class="m-5">
		<div class="chart" use:Highcharts={co2Config} />
	</div>
</DarkCard>

<DarkCard title={`CO2`} value={null} optimalValue={null} unit={'%'}>
	<div class="chart" use:Highcharts={co2GraphConfig} />
</DarkCard>
<TempHumidityCard {temperature} {humidity} />

<DarkCard
	title={`${$_('temperature')}/${$_('humidity')}`}
	value={null}
	optimalValue={null}
	unit={'%'}
>
	<div class="chart" use:Highcharts={tempMoistConfig} />
</DarkCard>
