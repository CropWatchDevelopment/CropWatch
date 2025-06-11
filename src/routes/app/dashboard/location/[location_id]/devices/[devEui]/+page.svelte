<script lang="ts">
	import { onMount } from 'svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { DeviceWithType } from '$lib/models/Device';

	import type { PageProps } from './$types';
	import { getDeviceDetailDerived, setupDeviceDetail } from './device-detail.svelte';
	import DataCard from '$lib/components/DataCard/DataCard.svelte';
	import StatsCard from '$lib/components/StatsCard/StatsCard.svelte';

	import {
		formatDateOnly,
		formatDateForInput,
		formatDateForDisplay as utilFormatDateForDisplay
	} from '$lib/utilities/helpers';
	import WeatherCalendar from '$lib/components/WeatherCalendar.svelte';
	import moment from 'moment';

	// Get device data from server load function
	let { data }: PageProps = $props();

	let user = $state(data.user);
	let device = $state(data.device as DeviceWithType);
	let dataType = $state(data.dataType);
	let latestData = $state(data.latestData);
	let historicalData = $state(data.historicalData || []);

	// Define the type for a calendar event
	interface CalendarEvent {
		id: Date;
		start: Date;
		end: Date;
		allDay: boolean;
		title: string;
		display: string;
	}

	let calendarEvents = $state<CalendarEvent[]>([]);

	// Setup device detail functionality
	const deviceDetail = $state(setupDeviceDetail());

	// Destructure from deviceDetail - these are reactive states/functions
	const {
		stats,
		chartData, // Not directly used in template, but available
		loading, // Bound to deviceDetail.loading
		error, // Bound to deviceDetail.error
		processHistoricalData,
		fetchDataForDateRange, // This is deviceDetail.fetchDataForDateRange
		renderVisualization, // This is deviceDetail.renderVisualization
		initializeDateRange // This is deviceDetail.initializeDateRange
		// deviceDetail.startDate and deviceDetail.endDate (Date objects) are accessed via deviceDetail
	} = deviceDetail;

	// DOM element references
	let chart1: HTMLElement | undefined = $state();
	let chart1Brush: HTMLElement | undefined = $state();
	let dataGrid: HTMLElement | undefined = $state();

	// Local string states for date inputs, bound to the input fields
	let startDateInputString = $state('');
	let endDateInputString = $state('');

	// Derived properties
	const derived = $state(getDeviceDetailDerived(device, dataType, latestData));
	const {
		deviceTypeName,
		temperatureChartVisible,
		humidityChartVisible,
		moistureChartVisible,
		co2ChartVisible,
		phChartVisible
	} = derived;

	onMount(() => {
		initializeDateRange(); // This sets deviceDetail.startDate and deviceDetail.endDate (Date objects)

		// Sync input strings with initial Date objects from deviceDetail
		startDateInputString = formatDateForInput(deviceDetail.startDate);
		endDateInputString = formatDateForInput(deviceDetail.endDate);

		processHistoricalData(historicalData); // Initial processing of server-loaded data
		calendarEvents = updateEvents(); // Initialize calendar events based on historical data
	});

	// Effect to re-render visualization when historicalData or DOM elements change
	$effect(() => {
		renderVisualization(historicalData, dataType, latestData, chart1, chart1Brush, dataGrid);
	});

	// Effect to keep input strings in sync if deviceDetail.startDate/endDate change (e.g. by initializeDateRange)
	$effect(() => {
		if (deviceDetail.startDate) {
			startDateInputString = formatDateForInput(deviceDetail.startDate);
		}
	});
	$effect(() => {
		if (deviceDetail.endDate) {
			endDateInputString = formatDateForInput(deviceDetail.endDate);
		}
	});

	const updateEvents = (data: any[] = historicalData): CalendarEvent[] => {
		// Group data by date
		const dailyStats: { [date: string]: { date: Date; high: number; low: number } } = {};
		data.forEach((event) => {
			const dateStr = new Date(event.created_at).toISOString().split('T')[0];
			const temp = Number(event.temperature_c);
			if (!dailyStats[dateStr]) {
				dailyStats[dateStr] = {
					date: new Date(dateStr),
					high: temp,
					low: temp
				};
			} else {
				dailyStats[dateStr].high = Math.max(dailyStats[dateStr].high, temp);
				dailyStats[dateStr].low = Math.min(dailyStats[dateStr].low, temp);
			}
		});
		// Create calendar events with daily highs and lows
		return Object.values(dailyStats).map((day) => ({
			id: day.date,
			start: day.date,
			end: day.date,
			allDay: true,
			title: `${day.low.toFixed(1)}° - ${day.high.toFixed(1)}°`,
			display: 'auto'
		}));
	};

	// Function to handle fetching data for a specific date range
	async function handleDateRangeSubmit() {
		if (!startDateInputString || !endDateInputString) {
			deviceDetail.error = 'Please select both start and end dates.';
			return;
		}

		// Parse local string dates from input into Date objects
		// new Date('YYYY-MM-DD') can have timezone issues. Parsing components is safer.
		const [sYear, sMonth, sDay] = startDateInputString.split('-').map(Number);
		const finalStartDate = new Date(sYear, sMonth - 1, sDay); // Month is 0-indexed

		const [eYear, eMonth, eDay] = endDateInputString.split('-').map(Number);
		// Set end date to the end of the selected day to be inclusive for the query
		const finalEndDate = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999); // Month is 0-indexed

		if (finalStartDate > finalEndDate) {
			deviceDetail.error = 'Start date must be before end date.';
			return;
		}

		deviceDetail.error = null; // Clear previous errors before fetching

		const newData = await fetchDataForDateRange(device, finalStartDate, finalEndDate);
		console.log('Requested range:', finalStartDate, finalEndDate, 'Received:', newData);
		if (newData) {
			historicalData = newData; // This will trigger $effect for renderVisualization
			calendarEvents = updateEvents(newData); // Use newData directly
		} else {
			calendarEvents = updateEvents(historicalData);
		}
	}

	// Expose formatDateForDisplay for the template, aliased from helpers
	const formatDateForDisplay = utilFormatDateForDisplay;
</script>

<svelte:head>
	<title>Device Details - {device?.name || device?.dev_eui}</title>
</svelte:head>

<div id="chart-line"></div>

<div class="mx-auto max-w-6xl p-4">
	<section class="mb-8">
		<!-- Back to Dashboard link -->
		<div class="mb-2">
			<a href="/app/dashboard" class="text-sm text-blue-500 hover:underline">
				&larr; Back to Dashboard
			</a>
		</div>

		<!-- Heading -->
		<h1 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Soil Device Details</h1>

		<a
			href="/app/dashboard/location/{device?.location_id}/devices/{device?.dev_eui}/settings"
			class="mb-4 inline-flex items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-in-out
				hover:bg-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
				dark:bg-blue-500 dark:hover:bg-blue-400 dark:focus:ring-offset-zinc-800">Settings</a
		>

		<!-- Device metadata container -->
		<div class="rounded-lg bg-gray-100 p-4 shadow-sm dark:bg-zinc-800">
			<!-- Responsive: 1 col on mobile, 2 on md, 4 on lg -->
			<div class="grid grid-cols-1 gap-4 text-sm md:grid-cols-2 lg:grid-cols-4">
				<!-- Type -->
				<div>
					<span class="text-gray-500 dark:text-gray-300">Type:</span>
					<strong class="ml-1 break-words text-gray-900 dark:text-white">{deviceTypeName}</strong>
				</div>

				<!-- EUI -->
				<div>
					<span class="text-gray-500 dark:text-gray-300">EUI:</span>
					<strong class="ml-1 break-words text-gray-900 dark:text-white">{device.dev_eui}</strong>
				</div>

				<!-- Location ID -->
				{#if device?.location_id}
					<div>
						<span class="text-gray-500 dark:text-gray-300">Location ID:</span>
						<strong class="ml-1 text-gray-900 dark:text-white">{device.location_id}</strong>
					</div>
				{/if}

				<!-- Installed At -->
				{#if device?.installed_at}
					<div>
						<span class="text-gray-500 dark:text-gray-300">Installed:</span>
						<strong class="ml-1 text-gray-900 dark:text-white">
							{formatDateOnly(device.installed_at)}
						</strong>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<!-- Latest data section -->
	<section class="mb-12">
		<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
			Latest Sensor Readings
		</h2>

		{#if latestData}
			<div class="rounded-lg bg-white p-4 shadow dark:bg-zinc-900">
				<div class="flex flex-row justify-items-center">
					{#each Object.keys(latestData) as key}
						{#if !['id', 'dev_eui', 'created_at', 'is_simulated', 'battery_level', 'vape_detected', 'smoke_detected'].includes(key) && latestData[key] !== null}
							<DataCard
								{latestData}
								name={key}
								{key}
								type={key}
								metadata={key === 'created_at' || key === 'dev_eui'}
								class="w-full"
							/>
						{/if}
					{/each}
				</div>

				<p class="mt-4 text-right text-sm text-gray-500 italic opacity-70 dark:text-gray-400">
					Last updated: {formatDateForDisplay(latestData.created_at)}
				</p>
			</div>
		{:else}
			<p class="py-8 text-center text-gray-500 italic">No recent data available for this device.</p>
		{/if}
	</section>

	<!-- Video Feed is IP is there -->
	{#if device?.ip_log.length > 0}
		<section>
			{#each device.ip_log as log}
				<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
					<img
						class="sc-hHOBiw eJjIgh"
						src="https://153.137.8.13:2223/mjpg/video.mjpg?camera=1&amp;audiocodec=aac&amp;audiosamplerate=16000&amp;audiobitrate=32000&amp;videozprofile=classic&amp;timestamp=0&amp;cachebust=1"
						alt="Camera Stream"
					/>
				</h2>
			{/each}
		</section>
	{/if}

	<!-- Historical data section -->

	<section class="mb-12">
		<h2 class="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Historical Data</h2>

		<div class="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-zinc-800">
			<div class="flex flex-wrap items-end gap-2 md:gap-4">
				<!-- Date inputs -->
				<div class="flex flex-col">
					<label for="startDate" class="mb-1 text-sm text-gray-600 dark:text-gray-400"
						>Start Date:</label
					>
					<input
						id="startDate"
						type="date"
						bind:value={startDateInputString}
						max={endDateInputString}
						class="rounded border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
					/>
				</div>

				<div class="flex flex-col">
					<label for="endDate" class="mb-1 text-sm text-gray-600 dark:text-gray-400"
						>End Date:</label
					>
					<input
						id="endDate"
						type="date"
						bind:value={endDateInputString}
						min={startDateInputString}
						class="rounded border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
					/>
				</div>

				<!-- Button with alignment tweak -->
				<div class="pt-[26px]">
					<button
						onclick={handleDateRangeSubmit}
						class="rounded border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 ease-in-out
							hover:border-blue-500 hover:bg-blue-500
							focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none
							disabled:border-blue-400 disabled:bg-blue-400 disabled:text-white
							dark:border-blue-700 dark:bg-blue-500 dark:text-white
							dark:hover:border-blue-400 dark:hover:bg-blue-400
							dark:focus:ring-offset-zinc-800 dark:disabled:border-blue-800 dark:disabled:bg-blue-800"
						disabled={loading}
					>
						{loading ? 'Loading…' : 'Fetch Data'}
					</button>
				</div>
			</div>

			{#if error}
				<p class="mt-2 text-sm text-red-600">{error}</p>
			{/if}
		</div>
	</section>

	<section class="mb-12">
		{#if loading}
			<!-- Loading State -->
			<div
				class="flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-100 p-8 shadow dark:bg-zinc-800"
			>
				<Spinner />
				<p class="text-gray-700 dark:text-gray-300">Loading historical data...</p>
			</div>
		{:else if historicalData.length === 0}
			<!-- Empty State -->
			<div
				class="rounded-lg bg-gray-100 p-6 text-center text-gray-500 italic shadow dark:bg-zinc-800 dark:text-gray-400"
			>
				No historical data available for the selected date range.
			</div>
		{:else}
			<!-- Statistical Summary -->
			<div class="mb-8">
				<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
					Statistical Summary
				</h3>

				<!-- <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"> -->
				<div class="flex flex-row gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#if temperatureChartVisible}
						<StatsCard
							notation="°C"
							title="Temperature"
							min={stats.temperature_c?.min}
							max={stats.temperature_c?.max}
							avg={stats.temperature_c?.avg}
							median={stats.temperature_c?.median}
							stdDev={stats.temperature_c?.stdDev}
							count={stats.temperature_c?.count}
							lastReading={stats.temperature_c?.lastReading}
							trend={stats.temperature_c?.trend}
						/>
					{/if}
					{#if humidityChartVisible}
						<StatsCard
							notation="%"
							title="Humidity"
							min={stats.humidity?.min}
							max={stats.humidity?.max}
							avg={stats.humidity?.avg}
							median={stats.humidity?.median}
							stdDev={stats.humidity?.stdDev}
							count={stats.humidity?.count}
							lastReading={stats.humidity?.lastReading}
							trend={stats.humidity?.trend}
						/>
					{/if}
					{#if moistureChartVisible}
						<StatsCard
							notation="%"
							title="Moisture"
							min={stats.moisture?.min}
							max={stats.moisture?.max}
							avg={stats.moisture?.avg}
							median={stats.moisture?.median}
							stdDev={stats.moisture?.stdDev}
							count={stats.moisture?.count}
							lastReading={stats.moisture?.lastReading}
							trend={stats.moisture?.trend}
						/>
					{/if}
					{#if co2ChartVisible}
						<StatsCard
							title="CO₂ (ppm)"
							min={stats.co2?.min}
							max={stats.co2?.max}
							avg={stats.co2?.avg}
							median={stats.co2?.median}
							stdDev={stats.co2?.stdDev}
							count={stats.co2?.count}
							lastReading={stats.co2?.lastReading}
							trend={stats.co2?.trend}
						/>
					{/if}
					{#if phChartVisible}
						<StatsCard
							title="pH"
							min={stats.ph?.min}
							max={stats.ph?.max}
							avg={stats.ph?.avg}
							median={stats.ph?.median}
							stdDev={stats.ph?.stdDev}
							count={stats.ph?.count}
							lastReading={stats.ph?.lastReading}
							trend={stats.ph?.trend}
						/>
					{/if}
				</div>
			</div>

			<!-- Charts -->
			<!-- Chart Visualizations -->
			<div class="mb-12">
				<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
					Data Visualization
				</h3>

				<!-- Generic Main Line + Brush Chart (always rendered if historicalData exists) -->
				<div class="mb-10 rounded-lg bg-white p-4 shadow dark:bg-zinc-900">
					<h4 class="mb-4 text-center text-base font-medium text-gray-800 dark:text-gray-200">
						All Sensor Data Over Time
					</h4>
					<div class="w-full">
						<div class="chart-placeholder">
							<div class="chart-visual">
								<div class="chart main-chart" bind:this={chart1}></div>
								<div class="chart brush-chart" bind:this={chart1Brush}></div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Raw Data Table -->
			<div>
				<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Raw Data</h3>
				<div class="overflow-x-auto rounded-lg bg-white p-2 shadow dark:bg-zinc-900">
					<div class="data-grid" bind:this={dataGrid}></div>
				</div>
			</div>
		{/if}
	</section>
</div>
<WeatherCalendar
	events={calendarEvents}
	onDateChange={(date: Date) => {
		startDateInputString = formatDateForInput(date);
		endDateInputString = formatDateForInput(moment(date).endOf('month').toDate());
		handleDateRangeSubmit();
	}}
/>

<style>
	/* Chart container structure */
	.chart-placeholder {
		position: relative;
		padding-top: 10px;
		width: 100%;
	}

	.chart-visual {
		display: flex;
		flex-direction: column;
		width: 100%;
	}

	.chart-visual .chart {
		width: 100%;
	}

	/* These classes are critical for ApexCharts rendering size */
	.chart-visual .main-chart {
		height: 350px;
	}

	.chart-visual .brush-chart {
		height: 150px;
		margin-top: 10px;
	}

	/* ApexCharts style overrides */
	/* .apexcharts-canvas {
		background-color: transparent !important;
		width: 100% !important;
		max-width: 100% !important;
	}

	.apexcharts-tooltip {
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2) !important;
		border: none !important;
	}

	.apexcharts-yaxis-label,
	.apexcharts-xaxis-label {
		font-size: 12px !important;
	} */

	/* Responsive layout for mobile */
	@media (max-width: 768px) {
		.chart-visual .main-chart {
			height: 300px;
		}

		.chart-visual .brush-chart {
			height: 120px;
		}
	}
</style>
