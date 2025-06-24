<script lang="ts">
	import DataCard from '$lib/components/DataCard/DataCard.svelte';
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import StatsCard from '$lib/components/StatsCard/StatsCard.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import WeatherCalendar from '$lib/components/WeatherCalendar.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { DeviceDataRecord } from '$lib/models/DeviceDataRecord';
	import {
		formatDateForInput,
		formatDateOnly,
		formatDateForDisplay as utilFormatDateForDisplay
	} from '$lib/utilities/helpers';
	import moment from 'moment';
	import { onMount } from 'svelte';
	import type { PageProps } from './$types';
	import { getDeviceDetailDerived, setupDeviceDetail } from './device-detail.svelte';

	// Get device data from server load function
	let { data }: PageProps = $props();

	let user = $state(data.user);
	let device = $state(data.device as DeviceWithType);
	let dataType = $state(data.dataType);
	let latestData: DeviceDataRecord | null = $state(null);
	let historicalData: DeviceDataRecord[] = $state([]);

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

	// Local string states for date inputs, bound to the input fields
	let startDateInputString = $state('');
	let endDateInputString = $state('');

	let loadingHistoricalData = $state(true); // Local loading state for historical data fetch
	let renderingVisualization = $state(true); // Local rendering state for visualization

	// Derived properties
	const {
		deviceTypeName,
		temperatureChartVisible,
		humidityChartVisible,
		moistureChartVisible,
		co2ChartVisible,
		phChartVisible
	} = $derived(getDeviceDetailDerived(device, dataType, latestData));

	onMount(() => {
		initializeDateRange(); // This sets deviceDetail.startDate and deviceDetail.endDate (Date objects)

		// Sync input strings with initial Date objects from deviceDetail
		startDateInputString = formatDateForInput(deviceDetail.startDate);
		endDateInputString = formatDateForInput(deviceDetail.endDate);
	});

	$effect(() => {
		(async () => {
			latestData = await data.latestData;
		})();
	});

	$effect(() => {
		(async () => {
			loadingHistoricalData = true;
			historicalData = await data.historicalData;
			processHistoricalData(historicalData); // Initial processing of server-loaded data
			calendarEvents = updateEvents(); // Initialize calendar events based on historical data
			loadingHistoricalData = false;
		})();
	});

	// Effect to re-render visualization when historicalData or DOM elements change
	$effect(() => {
		(async () => {
			renderingVisualization = true;
			await renderVisualization(historicalData, dataType, latestData, chart1, chart1Brush);
			renderingVisualization = false;
		})();
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

		loadingHistoricalData = true;
		deviceDetail.error = null; // Clear previous errors before fetching

		const newData = await fetchDataForDateRange(device, finalStartDate, finalEndDate);
		console.log('Requested range:', finalStartDate, finalEndDate, 'Received:', newData);
		if (newData) {
			historicalData = newData; // This will trigger $effect for renderVisualization
			calendarEvents = updateEvents(newData); // Use newData directly
		} else {
			calendarEvents = updateEvents(historicalData);
		}

		loadingHistoricalData = false;
	}

	// Expose formatDateForDisplay for the template, aliased from helpers
	const formatDateForDisplay = utilFormatDateForDisplay;
</script>

<svelte:head>
	<title>Device Details - {device?.name || device?.dev_eui}</title>
</svelte:head>

<div class="flex flex-col gap-4 p-4 xl:flex-row">
	<!-- Left pane -->
	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:flex xl:w-1/4 xl:min-w-[320px] xl:grid-cols-1 xl:flex-col xl:gap-6"
	>
		<!-- Latest data section -->
		<section class="flex-auto lg:w-auto xl:flex-none">
			<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
				Latest Sensor Readings
			</h2>
			{#if latestData}
				<div>
					<div class="grid grid-cols-2 gap-2">
						{#each Object.keys(latestData) as key}
							{#if !['id', 'dev_eui', 'created_at', 'is_simulated', 'battery_level', 'vape_detected', 'smoke_detected', 'traffic_hour'].includes(key) && latestData[key] !== null}
								<DataCard
									{latestData}
									name={key}
									{key}
									type={key}
									metadata={key === 'created_at' || key === 'dev_eui'}
								/>
							{/if}
						{/each}
					</div>

					<p class="mt-4 text-right text-sm text-gray-500 italic opacity-70 dark:text-gray-400">
						Last updated: {formatDateForDisplay(latestData.created_at)}
					</p>
				</div>
			{:else}
				<p class="pt-4 text-center text-gray-500 italic">No recent data available</p>
			{/if}
		</section>

		<!-- Video Feed is IP is there -->
		<section class="flex-none">
			<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Camera Stream</h2>
			{#if device?.ip_log.length > 0}
				{#each device.ip_log as log}
					<img
						class="sc-hHOBiw eJjIgh"
						src="https://153.137.8.13:2223/mjpg/video.mjpg?camera=1&amp;audiocodec=aac&amp;audiosamplerate=16000&amp;audiobitrate=32000&amp;videozprofile=classic&amp;timestamp=0&amp;cachebust=1"
						alt="Camera Stream"
					/>
				{/each}
			{:else}
				<p class="pt-4 text-center text-gray-500 italic">No stream available</p>
			{/if}
		</section>

		{#if device}
			<section class="flex-none">
				<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Map</h2>
				<div class="h-64">
					<LeafletMap
						lat={device.lat || 0}
						lon={device.long || 0}
						zoom={13}
						markers={[[device.lat || 0, device.long || 0]]}
					/>
				</div>
			</section>
		{/if}

		<!-- Device metadata container -->
		<section class="flex-none">
			<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Device Info</h2>
			<div class="rounded-lg bg-gray-50 p-4 shadow-sm dark:bg-zinc-800">
				<!-- Responsive: 1 col on mobile, 2 on md, 4 on lg -->
				<div class="grid grid-rows-1 gap-4 text-sm">
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

					<!-- We could add some more data -->
					<!-- <pre class="text-xs">{JSON.stringify(device, null, 2)}</pre> -->
				</div>
			</div>
		</section>
	</div>

	<!-- Right pane -->
	<div
		class="relative flex-1 border-t-1 border-neutral-400 pt-4 xl:border-t-0 xl:pt-0"
		inert={loadingHistoricalData}
		aria-busy={loadingHistoricalData}
	>
		<!-- Loading overlay -->
		{#if loadingHistoricalData}
			<div
				class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-50 backdrop-blur-xs dark:bg-zinc-900/75"
			>
				<Spinner />
				Loading historical data...
			</div>
		{/if}
		<!-- Date range selector -->
		<section class="flex justify-end">
			<div>
				<div class="flex flex-wrap items-end gap-2 md:gap-2">
					<!-- Date inputs -->
					<div class="flex flex-col">
						<label for="startDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400"
							>Start Date:</label
						>
						<TextInput
							id="startDate"
							type="date"
							bind:value={startDateInputString}
							max={endDateInputString}
							class="text-sm"
						/>
					</div>

					<div class="flex flex-col">
						<label for="endDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400"
							>End Date:</label
						>
						<TextInput
							id="endDate"
							type="date"
							bind:value={endDateInputString}
							min={startDateInputString}
							class="text-sm"
						/>
					</div>

					<div>
						<Button
							variant="primary"
							onclick={handleDateRangeSubmit}
							disabled={loadingHistoricalData}
						>
							{loadingHistoricalData ? 'Updating…' : 'Update'}
						</Button>
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
					class="flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 p-8 shadow dark:bg-zinc-800"
				>
					<Spinner />
					<p class="text-gray-700 dark:text-gray-300">Loading historical data...</p>
				</div>
			{:else if historicalData.length === 0}
				<!-- Empty State -->
				<div class="pt-4 text-center text-gray-500 italic">
					No historical data available for the selected date range.
				</div>
			{:else}
				<!-- Statistical Summary -->
				<div class="mb-8">
					<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Stats Summary</h2>
					<div class="flex flex-col gap-4 sm:grid-cols-1 md:grid-cols-2 md:flex-row lg:grid-cols-3">
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
				<section class="mb-12" inert={renderingVisualization} aria-busy={renderingVisualization}>
					<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Data Chart</h2>

					<!-- Generic Main Line + Brush Chart (always rendered if historicalData exists) -->
					<div class="relative mb-10 rounded-lg bg-gray-50 p-4 shadow dark:bg-zinc-800">
						{#if renderingVisualization}
							<div class="absolute inset-0 z-10 flex items-center justify-center">
								Rendering chart...
							</div>
						{/if}
						<h4
							class="mb-4 text-center text-base font-medium text-gray-800 dark:text-gray-200"
							hidden={renderingVisualization}
						>
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
				</section>
			{/if}
		</section>
		<div class="mt-4">
			<section>
				<h2 class="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Weather History</h2>
				<WeatherCalendar
					events={calendarEvents}
					onDateChange={(date: Date) => {
						startDateInputString = formatDateForInput(date);
						endDateInputString = formatDateForInput(moment(date).endOf('month').toDate());
						handleDateRangeSubmit();
					}}
				/>
			</section>
		</div>
	</div>
</div>

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
