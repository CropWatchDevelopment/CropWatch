<script lang="ts">
	import { getUserState } from '$lib/state/user-state.svelte';
	import moment from 'moment';
	import { Avatar, Card, Header } from 'svelte-ux';
	import Highcharts from 'highcharts';
	import more from 'highcharts/highcharts-more';
	import Chart from '@highcharts/svelte';
	import accessibility from 'highcharts/modules/accessibility';
	import { page } from '$app/stores';
	import CWCard from '$lib/components/UI/CWCard.svelte';
	import NpkOptionsDialog from '../dialogs/NPKOptionsDialog.svelte';
	import { mdiFlash, mdiPh, mdiTriangleOutline } from '@mdi/js';
	import EcOptions from '../dialogs/ECOptions.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { estimateNPK } from '$lib/utilities/ConvertEcPhToNPK';

	// Initialize Highcharts-more and accessibility
	more(Highcharts);
	accessibility(Highcharts);

	let userContext = getUserState();
	let location_id: number = +$page.params.location_id; // This returns a STRING!!!!
	let device = $state(
		userContext.allLocations
			.find((loc) => loc.location_id === location_id)
			?.cw_devices.find((dev) => dev.dev_eui === $page.params.dev_eui)
	);
	let latestTemperature = device?.latest_data?.temperature_c;
	let latestMoisture = device?.latest_data?.moisture;
	let latestEC = device?.latest_data?.ec;
	let latestPH = device?.latest_data?.ph;
	let npk = estimateNPK({
		ec_uS_cm: latestEC,
		vwc: latestMoisture,
		ph: latestPH
	});

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

{#if !latestTemperature}
	<h1>No Data found for this found for this device.</h1>
	<h2>You may need to:</h2>
	<ol>
		<li>Wait for data to be sent if this device is new (up to 1 hour)</li>
		<li>Select a different time range</li>
		<li>Check the device is powered on</li>
		<li>Contact support if this is an error.</li>
	</ol>
{:else}
	<div class="flex flex-row gap-5">
		<CWCard text={nameToJapaneseName('Soil Temperature')} value={latestTemperature} notation="°C" />
		<CWCard text={nameToJapaneseName('Moisture')} value={latestMoisture} notation="%" />
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
						text: nameToJapaneseName('Temperature and Moisture'),
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
							tickAmount: 10,
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
								enabled: device?.all_data?.some((data) => data.moisture > 0),
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
										data?.temperature_c
									]) ?? [],
							tooltip: {
								valueSuffix: ' °C'
							},
							lineWidth: 2,
							color: 'red'
						},
						{
							type: 'spline',
							name: nameToJapaneseName('Moisture'),
							yAxis: 1,
							data:
								device?.all_data
									?.slice()
									.reverse()
									.map((data) => [
										new Date(moment(data.created_at).utc(true).local()).getTime(),
										data.moisture
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

	<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
		{#if latestPH}
			<Card class="w-full pb-5">
				<Header slot="header" class="border-b">
					<p slot="subheading" class="text-2xl">NPK Estimation</p>
					<div slot="avatar">
						<Avatar class="font-bold text-primary-content" icon={mdiTriangleOutline} />
					</div>
					<div slot="actions">
						<NpkOptionsDialog />
					</div>
				</Header>
				<div class="w-full text-center text-4xl">
					N:{npk.nitrogen_mgkg} P:{npk.phosphorus_mgkg} K:{npk.potassium_mgkg}
					<Chart
						options={{
							chart: {
								polar: true,
								type: 'line',
								backgroundColor: 'transparent'
							},
							title: {
								text: '',
								style: {
									color: 'orange',
									fontSize: '20px'
								}
							},
							xAxis: {
								categories: ['(N)', '(P)', '(K)'],
								labels: {
									style: {
										color: 'orange',
										fontSize: '16px'
									}
								}
							},
							yAxis: {
								gridLineInterpolation: 'polygon',
								lineWidth: 0,
								min: 0
							},
							series: [
								{
									name: '',
									data: [npk.nitrogen_mgkg, npk.phosphorus_mgkg, npk.potassium_mgkg],
									color: 'aqua'
								}
							],
							tooltip: {
								pointFormat: '{series.name}: <b>{point.y} mg/kg</b>'
							},
							plotOptions: {
								column: {
									borderWidth: 0,
									dataLabels: {
										enabled: true,
										style: {
											color: 'orange',
											fontSize: '14px'
										}
									}
								}
							},
							responsive: {
								rules: [
									{
										condition: {
											maxWidth: 500
										},
										chartOptions: {
											title: {
												x: 0
											},
											// legend: {
											// 	align: 'center',
											// 	verticalAlign: 'bottom',
											// 	layout: 'horizontal'
											// },
											pane: {
												size: '70%'
											}
										}
									}
								]
							}
						}}
						highcharts={Highcharts}
					/>
				</div>
			</Card>

			<Card class="w-full pb-5">
				<Header slot="header" class="border-b">
					<p slot="subheading" class="text-2xl">PH</p>
					<div slot="avatar">
						<Avatar class="font-bold text-primary-content" icon={mdiPh} />
					</div>
				</Header>
				<div class="w-full text-center text-4xl">
					<Chart
						options={{
							chart: {
								type: 'gauge',
								plotBorderWidth: 0,
								plotShadow: false,
								backgroundColor: 'transparent'
							},
							exporting: {
								enabled: true
							},
							title: {
								text: '&nbsp;',
								style: {
									color: 'orange' // Dynamic text color
								}
							},
							pane: {
								startAngle: -90,
								endAngle: 90,
								background: [],
								center: ['50%', '75%']
							},
							yAxis: {
								min: 3,
								max: 10,
								tickPixelInterval: 72,
								tickPosition: 'inside',
								tickLength: 20,
								tickWidth: 2,
								labels: {
									distance: 20,
									style: {
										fontSize: '16px',
										fontWeight: 'bold',
										color: 'orange' // Dynamic label color
									}
								},
								lineWidth: 0,
								plotBands: [
									{
										from: 3,
										to: 4,
										color: 'yellow',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 4,
										to: 5,
										color: 'orange',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 5,
										to: 6,
										color: 'green',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 6,
										to: 7,
										color: 'orange',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 7,
										to: 8,
										color: 'yellow',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 8,
										to: 10,
										color: 'red',
										thickness: 20,
										zIndex: 1000
									}
								]
							},
							series: [
								{
									type: 'gauge',
									name: 'pH',
									data: [latestPH],
									tooltip: {
										valueSuffix: ` pH`
									},
									dataLabels: {
										format: `{y} pH`,
										borderWidth: 0,
										style: {
											fontSize: '32px',
											color: 'orange' // Dynamic data label color
										}
									},
									dial: {
										radius: '80%',
										backgroundColor: 'gray', // Dynamic dial color
										baseWidth: 12,
										baseLength: '0%',
										rearLength: '0%',
										borderWidth: 2
									},
									pivot: {
										backgroundColor: 'gray', // Dynamic pivot color
										radius: 6,
										borderWidth: 2
									}
								}
							]
						}}
						highcharts={Highcharts}
					/>
				</div>
			</Card>
		{/if}

		{#if latestEC}
			<Card class="w-full pb-5">
				<Header slot="header" class="border-b">
					<p slot="subheading" class="text-2xl">EC</p>
					<div slot="avatar">
						<Avatar class="font-bold text-primary-content" icon={mdiFlash} />
					</div>
					<div slot="actions">
						<EcOptions />
					</div>
				</Header>
				<div class="w-full text-center text-4xl">
					<Chart
						options={{
							chart: {
								type: 'gauge',
								plotBorderWidth: 0,
								plotShadow: false,
								backgroundColor: 'transparent'
							},
							exporting: {
								enabled: true
							},
							title: {
								text: '',
								style: {
									color: 'orange' // Dynamic text color
								}
							},
							pane: {
								startAngle: -90,
								endAngle: 90,
								background: [],
								center: ['50%', '75%']
							},
							yAxis: {
								min: 3,
								max: 1000,
								tickPixelInterval: 72,
								tickPosition: 'inside',
								tickLength: 20,
								tickWidth: 2,
								labels: {
									distance: 20,
									style: {
										fontSize: '16px',
										fontWeight: 'bold',
										color: 'orange' // Dynamic label color
									}
								},
								lineWidth: 0,
								plotBands: [
									{
										from: 3,
										to: 4,
										color: 'yellow',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 4,
										to: 5,
										color: 'orange',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 5,
										to: 6,
										color: 'green',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 6,
										to: 7,
										color: 'orange',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 7,
										to: 8,
										color: 'yellow',
										thickness: 20,
										zIndex: 1000
									},
									{
										from: 8,
										to: 10,
										color: 'red',
										thickness: 20,
										zIndex: 1000
									}
								]
							},
							series: [
								{
									type: 'gauge',
									name: '',
									data: [latestEC],
									tooltip: {
										valueSuffix: ` `
									},
									dataLabels: {
										format: `{y} µS/cm`,
										borderWidth: 0,
										style: {
											fontSize: '32px',
											color: 'orange' // Dynamic data label color
										}
									},
									dial: {
										radius: '80%',
										backgroundColor: 'gray', // Dynamic dial color
										baseWidth: 12,
										baseLength: '0%',
										rearLength: '0%',
										borderWidth: 2
									},
									pivot: {
										backgroundColor: 'gray', // Dynamic pivot color
										radius: 6,
										borderWidth: 2
									}
								}
							]
						}}
						highcharts={Highcharts}
					/>
				</div>
			</Card>
		{/if}
	</div>
{/if}
