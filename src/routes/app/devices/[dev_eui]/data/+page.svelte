<script lang="ts">
	import Highcharts from '$lib/actions/highcharts.action';

	import { browser } from '$app/environment';
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { HighChartsTimeSeriesChart } from '$lib/charts/highcharts/timeseries';
	import { HighchartsDataFactory } from '$lib/highcharts-dto/highcharts-dto-Selector';
	import Back from '$lib/components/ui/Back.svelte';
	import { Card } from 'svelte-ux';

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
	let sensorName: string = '';
	let dataPoints: any[] = [];
	let bbb;


	onMount(async () => {
		if (browser)
			await fetch(
				`/api/v1/devices/${$page.params.dev_eui}/data?=page=0&count=${window.screen.width < 768 ? 60 : 500}`
			)
				.then((res) => res.json())
				.then(async (data) => {
					currentHumidity = data.at(-1).humidity;
					currentTemp = data.at(-1).temperatureC;
					const device_type = await fetch(`/api/v1/devices/${$page.params.dev_eui}/type`).then((res) =>
						res.json()
					);

					sensorName = device_type.name;
					const ddd = HighchartsDataFactory.create(device_type.cw_device_type.data_table, data);
					const bbb = ddd.getHighchartsData();
					dataPoints = bbb;
					const ccc = [
							...Object.keys(bbb).map((key, i) => ({
								type: 'line',
								yAxis: 0,
								name: key.replace('_', ' ').toUpperCase(),
								color: getRandomColor(),
								data: bbb[key]
							}))
						];
						console.log(ccc)
					config = HighChartsTimeSeriesChart(
						ccc,
						'Temperature'
					);
					console.log(config)
				})
				.catch((err) => {
					console.log(err);
				});
	});

	function getRandomColor() {
		const r = Math.floor(Math.random() * 256);
		const g = Math.floor(Math.random() * 256);
		const b = Math.floor(Math.random() * 256);
		return `rgb(${r},${g},${b})`;
	}

	onDestroy(() => {
		// if (browser && channels) {
		// 	channels.unsubscribe();
		// }
	});
</script>

<div>
	<div class="flex flex-row">
		<Back />
		<h2 class="self-center ml-2 font font-light text-2xl text-surface-100">{sensorName}</h2>
	</div>
	<nav>
		<a href="rules" class="text-surface-100">View Sensor Rules</a>
	</nav>
	<div class="grid grid-cols-{Object.keys(dataPoints).length} grid-flow-col gap-2 w-full mb-2">
		{#each Object.keys(dataPoints) as key}
		<Card>
			<p>{key} : {dataPoints[key][0][1]}</p>
		</Card>
		{/each}
	</div>
</div>
<div class="chart" use:Highcharts={config} />
