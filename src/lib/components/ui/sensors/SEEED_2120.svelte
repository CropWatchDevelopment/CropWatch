<script lang="ts">
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import DarkCard from './../DarkCard.svelte';
	import { ProgressCircle } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import TestCompas from '../TestCompas.svelte';
	import DarkCard2 from '../DarkCard2.svelte';
	import {
		UVI_to_text,
		degreesToDirection,
		fetchWeatherData,
		weatherData
	} from '$lib/stores/weatherStore';
	import UvIndex from '../UVIndex.svelte';
	import LuxGuage from '../LuxGuage.svelte';
	import RainPerHourGuage from '../RainPerHourGuage.svelte';
	import { writable } from 'svelte/store';
	import { getWeatherImage } from '$lib/utilities/weatherCodeToImage';
	import { isDayTime } from '$lib/utilities/isDayTime';

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
	let windSpeed = data.at(0).wind_speed;
	let windDirection = degreesToDirection(arrowRotation); // Update this value dynamically if needed

	let luxValue = data.at(0).lux;
	let uvIndex = data.at(0).uv;
	let uvIndexText = UVI_to_text(uvIndex);

	let rainValue = data.at(0).rainfall;
	let pressureValue = data.at(0).pressure || 0;
	let locationWeatherData = writable(null);

	fetch(`/api/v1/devices/${dev_eui}`)
		.then((res) => res.json())
		.then(async (res) => {
			if (res.length > 0) {
				let lat = res[0].cw_devices.cw_device_locations.cw_locations.latitude;
				let lon = res[0].cw_devices.cw_device_locations.cw_locations.longitude;
				const weather = await fetchWeatherData(lat, lon);
				locationWeatherData.set(weather);
			}
		});

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

	$: windSpeedChartConfig = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: '',
				color: '#2cafff',
				data: data.map((d: any) => [
					new Date(d.created_at).valueOf(),
					+(d.wind_speed * 3.6).toFixed(2)
				])
			}
		],
		[
			{
				// Secondary yAxis
				title: {
					text: '',
					style: {
						color: 'silver'
					}
				},
				labels: {
					format: '{value}',
					style: {
						color: 'silver'
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

<DarkCard2>
	<div class="flex flex-row items-center justify-center">
		{$_('weatherStation.Current_Weather')}
		<span class="flex-auto" />
		{#if $locationWeatherData}
			{#await getWeatherImage($locationWeatherData.weatherCode, isDayTime())}
				<ProgressCircle />
			{:then image}
				<img src={image} alt="weather code icon" class="ml-2 w-12" />
			{:catch error}
				<p>{error.message}</p>
			{/await}
		{:else}
			<ProgressCircle />
		{/if}
	</div>
</DarkCard2>
<DarkCard title="{$_('weatherStation.windspeedDirection')}">
	<TestCompas {temperature} {windSpeed} {windDirection} {arrowRotation} {humidity} />
</DarkCard>
<DarkCard title="{$_('weatherStation.uvLux')}">
	<div class="grid grid-flow-col grid-cols-2 gap-5 lg:items-center">
		<UvIndex {uvIndex} uvLevel={uvIndexText} />
		<LuxGuage {luxValue} />
	</div>
</DarkCard>
<DarkCard title="{$_('weatherStation.rainfallPressure')}">
	<div class="flex flex-row w-full justify-center">
		<RainPerHourGuage {rainValue} {pressureValue} />
	</div>
</DarkCard>
<DarkCard title={$_('temp_humidity')}>
	<div class="chart" use:Highcharts={config} />
	<DarkCard
		title="{$_('weatherStation.maxTemperature')}"
		value={Math.max(...data.map((periodData) => periodData.temperatureC)).toFixed(2)}
		unit="ºC"
	/>
	<DarkCard
		title="{$_('weatherStation.averageTemperature')}"
		value={(data.reduce((total, next) => total + next.temperatureC, 0) / data.length).toFixed(2)}
		unit="ºC"
	/>
	<DarkCard
		title="{$_('weatherStation.minimumTemperature')}"
		value={Math.min(...data.map((periodData) => periodData.temperatureC)).toFixed(2)}
		unit="ºC"
	/>
</DarkCard>
<DarkCard
	title="{$_('rainfall')} mm/h"
	value={data.reduce((sum, item) => sum + item.rainfall, 0).toFixed(2)}
	optimalValue={null}
	unit={'mm/day'}
>
	<div class="chart" use:Highcharts={rainBarChartConfig} />
	<DarkCard
		title="{$_('weatherStation.maxRainfall')}"
		value={Math.max(...data.map((periodData) => periodData.rainfall)).toFixed(2)}
		unit=" mm/h"
	/>
	<DarkCard
		title="{$_('weatherStation.averageRainfall')}"
		value={(data.reduce((total, next) => total + next.rainfall, 0) / data.length).toFixed(2)}
		unit=" mm/h"
	/>
</DarkCard>
<DarkCard title="{$_('weatherStation.uvLux')}" value={null} optimalValue={null} unit={'ºC'}>
	<div class="chart" use:Highcharts={luxUvChartConfig} />
	<DarkCard
		title="{$_('weatherStation.maxUvLux')}"
		value="{Math.max(...data.map((periodData) => periodData.lux * 3.6)).toFixed(2)} / {Math.max(
			...data.map((periodData) => periodData.uv * 3.6)
		).toFixed(2)}"
		unit=" "
	/>
	<DarkCard
		title="{$_('weatherStation.averageUvLux')}"
		value="{(data.reduce((total, next) => total + next.lux, 0) / data.length).toFixed(2)} / {(
			data.reduce((total, next) => total + next.uv, 0) / data.length
		).toFixed(2)}"
		unit=" "
	/>
</DarkCard>
<DarkCard title="{$_('weatherStation.barometricPressure')}" value={null} optimalValue={null} unit={'ºC'}>
	<div class="chart" use:Highcharts={pressureChartConfig} />
	<DarkCard
		title="{$_('weatherStation.maxPressure')}"
		value={Math.max(...data.map((periodData) => periodData.pressure / 100)).toFixed(2)}
		unit="kPh"
	/>
	<DarkCard
		title="{$_('weatherStation.averagePressure')}"
		value={(data.reduce((total, next) => total + next.pressure / 100, 0) / data.length).toFixed(2)}
		unit="kPh"
	/>
	<DarkCard
		title="{$_('weatherStation.minimumPressure')}"
		value={Math.min(...data.map((periodData) => periodData.pressure / 100)).toFixed(2)}
		unit="kPh"
	/>
</DarkCard>
<DarkCard title="{$_('weatherStation.windSpeed')}" value={null} optimalValue={null} unit={'ºC'}>
	<div class="chart" use:Highcharts={windSpeedChartConfig} />
	<DarkCard
		title="{$_('weatherStation.maxWindSpeed')}"
		value={Math.max(...data.map((periodData) => periodData.wind_speed * 3.6)).toFixed(2)}
		unit="km/h"
	/>
	<DarkCard
		title="{$_('weatherStation.averageWindSpeed')}"
		value={(data.reduce((total, next) => total + next.wind_speed, 0) / data.length).toFixed(2)}
		unit="km/h"
	/>
</DarkCard>
