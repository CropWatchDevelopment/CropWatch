<script lang="ts">
	import { getUserState } from '$lib/state/user-state.svelte';
	import moment from 'moment';
	import { Card } from 'svelte-ux';
	import Highcharts from 'highcharts';
	import more from 'highcharts/highcharts-more';
	import Chart from '@highcharts/svelte';
	import TemperatureHumidityCircle from '../UI/TemperatureHumidityCircle.svelte';
	import accessibility from 'highcharts/modules/accessibility';
	import { page } from '$app/stores';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';

	more(Highcharts);
	accessibility(Highcharts);

	let userContext = getUserState();
	let location_id: number = +$page.params.location_id; // This returns a STRING!!!!
	let device = $state(
		userContext.allLocations
			.find((loc) => loc.location_id === location_id)
			?.cw_devices.find((dev) => dev.dev_eui === $page.params.dev_eui)
	);
	let latestTemperature = device?.latest_data.temperature_c;
	let latestHumidity = device?.latest_data.humidity;

	$effect(() => {
		if (device) {
			userContext.fetchLatestDeviceData(
				device,
				moment().subtract(1, 'day').toDate(),
				moment().toDate()
			)?.all_data;
		}
	});
</script>

<div class="flex flex-row gap-5">
	<Card class="w-full">
		<TemperatureHumidityCircle
			temperature={latestTemperature}
			temperatureNotation="ºC"
			humidity={latestHumidity ?? null}
		/>
	</Card>
</div>

<div class="my-4 flex w-full flex-row gap-5">
	{#if device && device?.all_data && device?.all_data.length > 0 && device?.all_data[0].co2}
		<Card class="w-full">
			<Chart
				options={{
					chart: {
						type: 'line',
						backgroundColor: 'transparent',
						height: 500
					},
					title: {
						text: 'CO²',
						style: {
							color: 'orange'
						}
					},
					legend: {
						enabled: false
					},
					responsive: {
						rules: [
							{
								condition: {
									maxHeight: 320
								},
								chartOptions: {
									yAxis: [
										{
											tickInterval: 50
										},
										{}
									]
								}
							}
						]
					},
					xAxis: {
						type: 'datetime', // Use datetime type for the x-axis
						labels: {
							style: {
								color: 'green',
								fontSize: '20px'
							},
							format: `{value:%m/%d - %H:%M}`,
							rotation: 90
						},
						title: {
							text: ''
						}
					},
					yAxis: [
						{
							title: {
								text: ''
							},
							labels: {
								format: '{value}ppm',
								style: {
									color: 'green',
									fontSize: '20px'
								}
							}
						}
					],
					series: [
						{
							type: 'spline',
							name: 'CO2',
							data:
								device?.all_data
									?.slice()
									.reverse()
									.map((data) => [
										new Date(moment(data.created_at).utc(true).local()).getTime(),
										data.co2
									]) ?? [],
							tooltip: {
								valueSuffix: ' °C'
							},
							lineWidth: 2,
							color: 'lime'
						}
					]
				}}
				highcharts={Highcharts}
			/>
		</Card>
	{/if}
</div>

<div class="my-4 flex w-full flex-row gap-5">
	<Card class="w-full">
		<Chart
			options={{
				chart: {
					type: 'line',
					backgroundColor: 'transparent',
					height: 500
				},
				title: {
					text: device?.all_data?.some((data) => data.humidity > 0)
						? nameToJapaneseName('Temperature & Humidity')
						: nameToJapaneseName('Temperature'),
					style: {
						color: 'orange'
					}
				},
				legend: {
					enabled: false
				},
				responsive: {
					rules: [
						{
							condition: {
								maxHeight: 100
							},
							chartOptions: {
								yAxis: [
									{
										tickInterval: 10
									},
									{}
								]
							}
						}
					]
				},
				xAxis: {
					type: 'datetime', // Use datetime type for the x-axis
					labels: {
						style: {
							color: 'orange',
							fontSize: '20px'
						},
						format: '{value:%m/%d - %H:%M}',
						rotation: 90
					},
					title: {
						text: ''
					}
				},
				yAxis: [
					{
						title: {
							text: ''
						},
						labels: {
							format: '{value}°C',
							style: {
								color: 'red',
								fontSize: '20px'
							}
						}
					},
					{
						title: {
							text: '',
							style: {
								color: 'aqua'
							}
						},
						softMax: 100,
						max: 100,
						min: 0,
						tickAmount: 10,
						labels: {
							enabled: device?.all_data?.some((data) => data.humidity > 0),
							format: '{value}%',
							style: {
								color: 'aqua',
								fontSize: '20px'
							}
						},
						opposite: true,
						showEmpty: false
					}
				],
				series: [
					{
						type: 'spline',
						name: nameToJapaneseName('Temperature'),
						yAxis: 0,
						data:
							device?.all_data
								?.slice()
								.reverse()
								.map((data) => [
									new Date(moment(data.created_at).utc(true).local()).getTime(),
									data.temperature_c
								]) ?? [],
						tooltip: {
							valueSuffix: ' °C'
						},
						lineWidth: 2,
						color: 'red'
					},
					{
						type: 'spline',
						name: nameToJapaneseName('Humidity'),
						yAxis: 1,
						data:
							device?.all_data
								?.slice()
								.reverse()
								.map((data) => [
									new Date(moment(data.created_at).utc(true).local()).getTime(),
									data.humidity
								]) ?? [],
						tooltip: {
							valueSuffix: ' %'
						},
						lineWidth: 2,
						color: 'aqua'
					}
				]
			}}
			highcharts={Highcharts}
		/>
	</Card>
</div>
