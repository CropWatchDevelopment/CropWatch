<script lang="ts">
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import Highcharts from '$lib/actions/highcharts.action';
	import DarkCard from './../DarkCard.svelte';
	import { Duration, ProgressCircle } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';
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
	import { get, writable } from 'svelte/store';
	//
	import nightCloudy from '$lib/images/weather/night/c02n.png';
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
		Current Weather
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
<DarkCard title="Wind Speed/Direction">
	<TestCompas {temperature} {windSpeed} {windDirection} {arrowRotation} {humidity} />
</DarkCard>
<DarkCard title="UV/LUX">
	<div class="grid grid-flow-col grid-cols-2 gap-5 lg:items-center">
		<UvIndex {uvIndex} uvLevel={uvIndexText} />
		<LuxGuage {luxValue} />
	</div>
</DarkCard>
<DarkCard title="Rainfall/Pressure">
	<div class="flex flex-row w-full justify-center">
		<RainPerHourGuage {rainValue} {pressureValue} />
	</div>
</DarkCard>
<DarkCard title={$_('temp_humidity')}>
	<div class="chart" use:Highcharts={config} />
	<DarkCard
		title="Max Temperature:"
		value={Math.max(...data.map((periodData) => periodData.temperatureC)).toFixed(2)}
		unit="ºC"
	/>
	<DarkCard
		title="Average Temperature:"
		value={(data.reduce((total, next) => total + next.temperatureC, 0) / data.length).toFixed(2)}
		unit="ºC"
	/>
	<DarkCard
		title="Min Temperature:"
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
		title="Max Rainfall:"
		value={Math.max(...data.map((periodData) => periodData.rainfall)).toFixed(2)}
		unit=" mm/h"
	/>
	<DarkCard
		title="Average Rainfall:"
		value={(data.reduce((total, next) => total + next.rainfall, 0) / data.length).toFixed(2)}
		unit=" mm/h"
	/>
</DarkCard>
<DarkCard title="LUX / UV" value={null} optimalValue={null} unit={'ºC'}>
	<div class="chart" use:Highcharts={luxUvChartConfig} />
	<DarkCard
		title="Max LUX/UV:"
		value="{Math.max(...data.map((periodData) => periodData.lux * 3.6)).toFixed(2)} / {Math.max(
			...data.map((periodData) => periodData.uv * 3.6)
		).toFixed(2)}"
		unit=" "
	/>
	<DarkCard
		title="Average LUX/UV:"
		value="{(data.reduce((total, next) => total + next.lux, 0) / data.length).toFixed(2)} / {(
			data.reduce((total, next) => total + next.uv, 0) / data.length
		).toFixed(2)}"
		unit=" "
	/>
</DarkCard>
<DarkCard title="Barometric Pressure" value={null} optimalValue={null} unit={'ºC'}>
	<div class="chart" use:Highcharts={pressureChartConfig} />
	<DarkCard
		title="Max Pressure:"
		value={Math.max(...data.map((periodData) => periodData.pressure / 100)).toFixed(2)}
		unit="kPh"
	/>
	<DarkCard
		title="Average Pressure:"
		value={(data.reduce((total, next) => total + next.pressure / 100, 0) / data.length).toFixed(2)}
		unit="kPh"
	/>
	<DarkCard
		title="Min Pressure:"
		value={Math.min(...data.map((periodData) => periodData.pressure / 100)).toFixed(2)}
		unit="kPh"
	/>
</DarkCard>
<DarkCard title="Wind Speed" value={null} optimalValue={null} unit={'ºC'}>
	<div class="chart" use:Highcharts={windSpeedChartConfig} />
	<DarkCard
		title="Max Wind Speed:"
		value={Math.max(...data.map((periodData) => periodData.wind_speed * 3.6)).toFixed(2)}
		unit="km/h"
	/>
	<DarkCard
		title="Average Wind Speed:"
		value={(data.reduce((total, next) => total + next.wind_speed, 0) / data.length).toFixed(2)}
		unit="km/h"
	/>
</DarkCard>
