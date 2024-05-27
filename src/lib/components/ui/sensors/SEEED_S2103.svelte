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
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';
	import TestCompas from '../TestCompas.svelte';
	import DarkCard2 from '../DarkCard2.svelte';
	import { UVI_to_text, degreesToDirection, fetchWeatherData, weatherData } from '$lib/stores/weatherStore';
	import UvIndex from '../UVIndex.svelte';
	import LuxGuage from '../LuxGuage.svelte';
	import RainPerHourGuage from '../RainPerHourGuage.svelte';
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	//
	import nightCloudy from '$lib/images/weather/night/c02n.png';

	export let data;
	export let sensorName = 'NS';
	export let permissions = 0;
	export let latitude;
	export let longitude;

	let dev_eui = data.at(0).dev_eui;
	const humidity = data.at(0).humidity;
	const dewPoint = data.at(0).dewPointC;
	const lastSeen: Date = data.at(0).created_at;
	const isActiveRecently = true;

	let temperature = data.at(0).temperatureC;
	let arrowRotation = data.at(0).wind_direction; // Update this value dynamically if needed
	let windDirection = degreesToDirection(arrowRotation); // Update this value dynamically if needed

	let luxValue = data.at(0).lux;
	let uvIndex = data.at(0).uv;
	let uvIndexText = UVI_to_text(uvIndex);

	let rainValue = 10; // data.at(0).rainfall;
	let pressureValue = data.at(0).pressure || 0;

	// let cloudy = fetchWeatherData(data.cw_locations.latitude, data.cw_locations.longitude);

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
					text: '',
					style: {
						color: 'red'
					}
				},
				labels: {
					format: '{value}',
					style: {
						color: 'red'
					}
				},
				opposite: false
			},
			{
				// Secondary yAxis
				title: {
					text: '',
					style: {
						color: 'lightblue'
					}
				},
				labels: {
					format: '{value}',
					style: {
						color: 'lightblue'
					}
				},
				opposite: true
			}
		],
		''
	);

	$: rainBarChartConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'column',
				yAxis: 0,
				name: '',
				color: '#2cafff',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), +d.rainfall.toFixed(2)])
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
					format: '{value}',
					style: {
						color: 'lightblue'
					}
				},
				opposite: false
			}
		],
		''
	);

	$: pressureChartConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: '',
				color: '#2cafff',
				data: data.map((d: any) => [
					new Date(d.created_at).valueOf(),
					+(d.pressure / 100).toFixed(2)
				])
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
					format: '{value}',
					style: {
						color: 'lightblue'
					}
				},
				opposite: false
			}
		],
		''
	);

	$: luxUvChartConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: '',
				color: 'yellow',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.lux])
			},
			{
				type: 'line',
				yAxis: 1,
				name: '',
				color: 'purple',
				data: data.map((d: any) => [new Date(d.created_at).valueOf(), d.uv])
			}
		],
		[
			{
				// Secondary yAxis
				title: {
					text: '',
					style: {
						color: 'yellow'
					}
				},
				labels: {
					format: '{value}',
					style: {
						color: 'yellow'
					}
				},
				opposite: false
			},
			{
				// Secondary yAxis
				title: {
					text: '',
					style: {
						color: '#2c0b57'
					}
				},
				labels: {
					format: '{value}',
					style: {
						color: '#2c0b57'
					}
				},
				opposite: true
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
			<div class="flex flex-row text-neutral-content">
				<p class="text-surface-100 text-4xl mr-2">{sensorName}</p>
				<EditSensorNameDialog {dev_eui} bind:currentSensorName={sensorName} />
			</div>
			<p class="text-slate-500">
				{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} />
				{$_('ago')}
			</p>
		</div>
	</div>

	<DarkCard2>
		<div class="flex flex-row items-center justify-center">
			Current Weather
			<span class="flex-auto" />
		</div>
	</DarkCard2>
	<DarkCard2>
		<TestCompas {temperature} {windDirection} {arrowRotation} {humidity} />
	</DarkCard2>
	<DarkCard2>
		<div class="grid grid-flow-col grid-cols-2 gap-5 lg:items-center">
			<UvIndex {uvIndex} uvLevel={uvIndexText} />
			<LuxGuage {luxValue} />
		</div>
	</DarkCard2>
	<DarkCard2>
		<div class="flex flex-row w-full justify-center">
			<RainPerHourGuage {rainValue} {pressureValue} />
		</div>
	</DarkCard2>
	<DarkCard title={$_('temp_humidity')}>
		<div class="chart" use:Highcharts={config} />
	</DarkCard>
	<DarkCard title="{$_('rainfall')} mm/h" value={null} optimalValue={null} unit={null}>
		<div class="chart" use:Highcharts={rainBarChartConfig} />
		<h2 class="text-lg">Total: {data.reduce((sum, item) => sum + item.rainfall, 0)}</h2>
	</DarkCard>
	<DarkCard title="LUX / UV" value={null} optimalValue={null} unit={'ºC'}>
		<div class="chart" use:Highcharts={luxUvChartConfig} />
	</DarkCard>
	<DarkCard title="Barometric Pressure" value={null} optimalValue={null} unit={'ºC'}>
		<div class="chart" use:Highcharts={pressureChartConfig} />
	</DarkCard>

	<SensorFooterControls {permissions} />
</div>
