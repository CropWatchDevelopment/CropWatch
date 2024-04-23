<script lang="ts">
	import Highcharts from '$lib/actions/highcharts.action';

	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import { supabase } from '$lib/supabaseClient';

	$: config = HighChartsTimeSeriesChart(
		[
			{
				type: 'line',
				yAxis: 0,
				name: 'Temperature',
				color: 'red',
				data: []
			},
			{
				type: 'line',
				yAxis: 1,
				name: 'Humidity',
				color: 'blue',
				data: []
			}
		],
		'Temperature'
	);
	let currentTemp: number = 0;
	let currentHumidity: number = 0;
	let tempData: any = [];
	let humidityData: any = [];

	const channels = supabase
		.channel('custom-insert-channel')
		.on(
			'postgres_changes',
			{ event: 'INSERT', schema: 'public', table: 'cw_air_thvd' },
			(payload) => {
				console.log('Change received!', payload);
				if (browser && payload.new.dev_eui === $page.params.dev_eui) {
					currentHumidity = payload.new.humidity;
					currentTemp = payload.new.temperatureC;
					tempData.push([new Date(payload.new.created_at).valueOf(), payload.new.temperatureC]);
					tempData.pop();

					humidityData.push([new Date(payload.new.created_at).valueOf(), payload.new.humidity]);
					humidityData.pop();
					
					config = HighChartsTimeSeriesChart(
						[
							{
								type: 'line',
								yAxis: 0,
								name: 'Temperature',
								color: 'red',
								data: tempData
							},
							{
								type: 'line',
								yAxis: 1,
								name: 'Humidity',
								color: 'blue',
								data: humidityData
							}
						],
						'Temperature'
					);
				}
			}
		)
		.subscribe();

	onMount(async () => {
		if (browser)
			await fetch(`/api/v1/devices/${$page.params.dev_eui}/data?=page=0&count=1000`)
				.then((res) => res.json())
				.then((data) => {
					console.log(data);
					currentHumidity = data.at(-1).humidity;
					currentTemp = data.at(-1).temperatureC;
					tempData = data.map((d: any) => [new Date(d.created_at).valueOf(), d.temperatureC]);
					humidityData = data.map((d: any) => [new Date(d.created_at).valueOf(), d.humidity]);
					config = HighChartsTimeSeriesChart(
						[
							{
								type: 'line',
								yAxis: 0,
								name: 'Temperature',
								color: 'red',
								data: tempData
							},
							{
								type: 'line',
								yAxis: 1,
								name: 'Humidity',
								color: 'blue',
								data: humidityData
							}
						],
						'Temperature'
					);
				})
				.catch((err) => {
					console.log(err);
				});
	});

	onDestroy(() => {
		if (browser && channels) {
			channels.unsubscribe();
		}
	});
</script>

<div>
	<h1>Device Data</h1>
	<p>Current Temp: {currentTemp}</p>
	<p>Current Humidity: {currentHumidity}</p>
</div>
<div class="chart" use:Highcharts={config} />
