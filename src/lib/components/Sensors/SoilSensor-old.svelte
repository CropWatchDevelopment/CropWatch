<script lang="ts">
	import { onMount } from 'svelte';
	import type { IDevice } from '$lib/interfaces/IDevice.interface';
	import { getUserState } from '$lib/state/user-state.svelte';
	import type { Tables } from '$lib/types/database.types';
	import CWCard from '$lib/components/UI/CWCard.svelte';
	import EcOptions from '../dialogs/ECOptions.svelte';
	import { nameToEmoji } from '$lib/utilities/NameToEmoji';
	import { TemperatureHumidityChartConfig } from '$lib/components/ChartConfigs/TemperatureHumidityChartConfig.svelte';
	import { WebChartConfig } from '../ChartConfigs/WebChart.svelte';
	import Highcharts from 'highcharts';
	import more from 'highcharts/highcharts-more';
	import accessibility from 'highcharts/modules/accessibility';
	import { Avatar, Button, Card, getSettings, Header, Icon } from 'svelte-ux';
	import Chart from '@highcharts/svelte';
	import { mdiDownload, mdiFlash, mdiPh, mdiTriangleOutline } from '@mdi/js';
	import moment from 'moment';
	import NpkOptionsDialog from '../dialogs/NPKOptionsDialog.svelte';
	import { ConvertEcPhToNPK } from '$lib/utilities/ConvertEcPhToNPK';
	import { PhGuageChartConfig } from '../ChartConfigs/PhGuageChart.svelte';
	import { EcGuageChartConfig } from '../ChartConfigs/EcGuageChart.svelte';

	more(Highcharts);
	accessibility(Highcharts);

	const userContext = getUserState();
	let dataLoaded = false; // Prevents rendering until data is fetched

	// SvelteKit v5: Export properties
	export let device: IDevice;
	export let sensorType: Tables<'cw_device_type'>;

	// Local chart configuration copies
	const phGuage = structuredClone(PhGuageChartConfig);
	const ecGuage = structuredClone(EcGuageChartConfig);
	const tempHumidityGraph = structuredClone(TemperatureHumidityChartConfig);
	const webGraph = structuredClone(WebChartConfig);

	// Fetch historical data if missing
	async function loadData() {
		if (!device.all_data || device.all_data.length === 0) {
			await userContext.fetchLatestDeviceData(
				device,
				moment().subtract(1, 'days').toDate(),
				moment().toDate()
			);
		}

		// Ensure charts update after fetching data
		updateCharts();
		dataLoaded = true;
	}

	// Prepare charts
	function updateCharts() {
		const allData = device.all_data ?? [];
		tempHumidityGraph.series[0] = {
			data: allData.map((data) => [new Date(data.created_at).getTime(), data.temperature_c])
		};
		tempHumidityGraph.series[1] = {
			data: allData.map((data) => [new Date(data.created_at).getTime(), data.moisture])
		};
		phGuage.series = [{ data: [device.latest_data?.ph ?? 0] }];
		ecGuage.series = [{ data: [device.latest_data?.ec ?? 0] }];
		const soilParams = {
			temperature: device.latest_data.temperature_c,
			moisture: device.latest_data.moisture,
			ec: device.latest_data.ec,
			ph: device.latest_data.ph,
			soilType: 'Clay'
		};
		let { N, P, K } = ConvertEcPhToNPK(soilParams);
		webGraph.series = [{ data: [N, P, K] }];
	}

	onMount(loadData);
</script>

{#if dataLoaded}
	<div class="flex flex-row gap-5">
		<CWCard
			icon={nameToEmoji(sensorType.primary_data_v2 ?? '?')}
			text={sensorType.primary_data_v2}
			value={device.latest_data?.temperature_c ?? 'N/A'}
			notation={sensorType.primary_data_notation}
		/>
		<CWCard
			icon={nameToEmoji(sensorType.secondary_data_v2 ?? '?')}
			text={sensorType.secondary_data_v2}
			value={device.latest_data?.[sensorType.secondary_data_v2] ?? 'N/A'}
			notation={sensorType.secondary_data_notation}
		/>
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
						text: 'Temperature',
						style: {
							color: 'white'
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
								color: 'white',
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
							name: 'Temperature',
							yAxis: 0,
							data:
								device?.all_data?.map((data) => [
									new Date(moment(data.created_at).utc(true).local()).getTime(),
									data.temperature_c
								]) ?? [],
							tooltip: {
								valueSuffix: ' °C'
							},
							lineWidth: 5,
							color: 'red'
						},
						{
							type: 'spline',
							name: 'Humidity',
							yAxis: 1,
							data:
								device?.all_data?.map((data) => [
									new Date(moment(data.created_at).utc(true).local()).getTime(),
									data.moisture
								]) ?? [],
							tooltip: {
								valueSuffix: ' %'
							},
							lineWidth: 5,
							color: 'aqua'
						}
					]
				}}
				highcharts={Highcharts}
			/>
		</Card>
	</div>

	<div class="grid grid-cols-1 gap-5 md:grid-cols-3">
		{#if device.latest_data?.ph}
			<Card class="w-full pb-5">
				<Header slot="header" class="border-b">
					<p slot="subheading" class="text-2xl">NPK</p>
					<div slot="avatar">
						<Avatar class="font-bold text-primary-content" icon={mdiTriangleOutline} />
					</div>
					<div slot="actions">
						<NpkOptionsDialog />
					</div>
				</Header>
				<div class="w-full text-center text-4xl">
					N:{webGraph.series[0].data[0]} P:{webGraph.series[0].data[1]} K:{webGraph.series[0]
						.data[2]}
					<Chart options={webGraph} highcharts={Highcharts} />
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
					{device.latest_data?.ph ?? 'N/A'}
					<Chart options={phGuage} highcharts={Highcharts} />
				</div>
			</Card>
		{/if}

		{#if device.latest_data?.ec}
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
					{device.latest_data?.ec ?? 'N/A'} µS/cm
					<Chart options={ecGuage} highcharts={Highcharts} />
				</div>
			</Card>
		{/if}
	</div>

	<div class="mt-5 w-full">
		<Card>
			<Header
				title="Latest AI Analysis:"
				subheading={moment().format('YYYY/MM/DD')}
				slot="header"
				class="border-b"
			>
				<div slot="avatar">
					<Avatar class="font-bold text-primary-content" icon={mdiFlash} />
				</div>
				<div slot="actions">
					<Button icon={mdiDownload} variant="outline" />
				</div>
			</Header>
			<div class="p-4">
				<p class="text-primary-content">No AI Analysis available</p>
			</div>
		</Card>
	</div>
{:else}
	<p>Loading soil sensor data...</p>
{/if}
