<script lang="ts">
	import { onMount } from 'svelte';
	import { getUserState } from '$lib/state/user-state.svelte';
	import moment from 'moment';
	import { Button, Card } from 'svelte-ux';
	import Highcharts from 'highcharts';
	import more from 'highcharts/highcharts-more';
	import Chart from '@highcharts/svelte';
	import accessibility from 'highcharts/modules/accessibility';
	import { page } from '$app/stores';
	import CwCalendar from '../UI/CWCalendar.svelte';

	// Initialize Highcharts modules
	more(Highcharts);
	accessibility(Highcharts);

	let dataLength = $state(0);
	let userContext = getUserState();
	let location_id: number = +$page.params.location_id; // Note: $page.params returns a string, so we cast it
	let device = $state(
		userContext.allLocations
			.find((loc) => loc.location_id === location_id)
			?.cw_devices.find((dev) => dev.dev_eui === $page.params.dev_eui)
	);
	
	$effect(() => {
		if (device && device?.all_data && device?.all_data.length != dataLength) {
			refreshData();
		}
	})

	onMount(() => {
		if (device) {
			userContext.fetchLatestDeviceData(
				device,
				moment().subtract(1, 'month').toDate(),
				moment().toDate()
			)?.all_data;
			// dataLength = device.all_data.length;
		}
	});

	let displayCalendar = $state(false);

	// Function to refresh data that also resets the calendar display
	function refreshData() {
		// Your existing refresh logic here

		// Turn off the calendar
		displayCalendar = false;

		// Optionally, turn it back on after a short delay
		setTimeout(() => {
			displayCalendar = true;
		}, 100); // Small delay to ensure reactivity
		dataLength = device.all_data.length;
	}
</script>

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
					text: 'Counts',
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
					type: 'datetime',
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
							format: '{value}',
							style: {
								color: 'orange',
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
						name: 'People',
						yAxis: 0,
						data:
							device?.all_data
								?.slice()
								.reverse()
								.map((data) => [
									new Date(moment(data.created_at).utc(true).local()).getTime(),
									data.people_count
								]) ?? [],
						tooltip: {
							valueSuffix: ''
						},
						lineWidth: 5,
						color: 'Yellow'
					},
					{
						type: 'spline',
						name: 'Cars',
						yAxis: 1,
						data:
							device?.all_data
								?.slice()
								.reverse()
								.map((data) => [
									new Date(moment(data.created_at).utc(true).local()).getTime(),
									data.car_count
								]) ?? [],
						tooltip: {
							valueSuffix: ''
						},
						lineWidth: 5,
						color: 'Red'
					},
					{
						type: 'spline',
						name: 'Cars',
						yAxis: 1,
						data:
							device?.all_data
								?.slice()
								.reverse()
								.map((data) => [
									new Date(moment(data.created_at).utc(true).local()).getTime(),
									data.bicycle_count
								]) ?? [],
						tooltip: {
							valueSuffix: ''
						},
						lineWidth: 5,
						color: 'Blue'
					}
				]
			}}
			highcharts={Highcharts}
		/>
	</Card>
</div>
<!-- {device?.all_data ? device?.all_data.length : 'No data'} -->
{#if device?.all_data && displayCalendar}
	<CwCalendar data={device.all_data} />
{/if}
