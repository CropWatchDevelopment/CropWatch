<script lang="ts">
	import { Duration } from 'svelte-ux';
	import DarkCard from '$lib/components/ui/DarkCard.svelte';
	import SensorFooterControls from '../SensorFooterControls.svelte';
	import ActiveImage from '$lib/images/UI/cw-10.svg';
	import inActiveImage from '$lib/images/UI/cw_sensor_status_inactive.svg';
	import moment from 'moment';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import { _ } from 'svelte-i18n';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';

	export let data;

	let dev_eui = data.at(0).dev_eui;
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
				name: $_('temperature'),
				color: 'red',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.soil_temperatureC])
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
		$_('soil_temperature')
	);

	$: moistureConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: $_('soil_moisture'),
				color: 'lightblue',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.soil_moisture])
			}
		],
		[
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
		''
	);
</script>

<DarkCard title={$_('soil_temperature')} value={temperature} optimalValue={20} unit={'ºC'}>
	<div class="chart" use:Highcharts={tempConfig} />
</DarkCard>

<DarkCard title={$_('soil_moisture')} value={moisture} optimalValue={40} unit={'%'}>
	<div class="chart" use:Highcharts={moistureConfig} />
</DarkCard>

<DarkCard title={$_('soil_EC')} value={soil_ec} unit={'dS/m'} optimalValue={1}></DarkCard>

