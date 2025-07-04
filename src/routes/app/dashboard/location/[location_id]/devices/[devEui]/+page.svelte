<script lang="ts">
	import { page } from '$app/state';
	import DataCard from '$lib/components/DataCard/DataCard.svelte';
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import StatsCard from '$lib/components/StatsCard/StatsCard.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import WeatherCalendar from '$lib/components/WeatherCalendar.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { DeviceDataRecord } from '$lib/models/DeviceDataRecord';
	import {
		formatDateForInput,
		formatDateOnly,
		formatDateForDisplay as utilFormatDateForDisplay
	} from '$lib/utilities/helpers';
	import { formatNumber } from '$lib/utilities/stats';
	import { onMount } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import { getDeviceDetailDerived, setupDeviceDetail } from './device-detail.svelte';
	import Header from './Header.svelte';
	import CsvDownloadButton from '$lib/csv/CsvDownloadButton.svelte';
	import { setupRealtimeSubscription } from './realtime.svelte';

	// Get device data from server load function
	let { data }: PageProps = $props();

	let { location_id, devEui } = page.params;
	let basePath = `/app/dashboard/location/${location_id}/devices/${devEui}`;
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
		title: string | { html: string };
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
			debugger;
			if (device.cw_device_type?.data_table_v2) {
				setupRealtimeSubscription(
					data.supabase,
					device.cw_device_type?.data_table_v2,
					devEui,
					(newData) => {
						latestData = newData;
					},
					0 // Retry count starts at 0
				);
			}
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

	const renderChart = async () => {
		renderingVisualization = true;
		await renderVisualization(historicalData, dataType, latestData, chart1, chart1Brush);
		renderingVisualization = false;
	};

	// Re-render chart when historical data or DOM elements change
	$effect(() => {
		void [historicalData, dataType, latestData, chart1, chart1Brush];
		renderChart();
	});

	// Re-render chart and calendar when the app locale changes, because the labels depend on it
	$effect(() => {
		void $locale;
		renderChart();
		calendarEvents = updateEvents(historicalData);
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
		const dailyStats: { [date: string]: Record<string, any> } = {};

		data.forEach((event) => {
			const dateStr = new Date(event.created_at).toISOString().split('T')[0];
			const date = new Date(dateStr);

			if (event.temperature_c) {
				const temp = Number(event.temperature_c);

				dailyStats[dateStr] ??= { key: 'temperature_c', date, high: -Infinity, low: Infinity };
				dailyStats[dateStr].high = Math.max(dailyStats[dateStr].high, temp);
				dailyStats[dateStr].low = Math.min(dailyStats[dateStr].low, temp);
			}

			if (event.car_count || event.people_count || event.bicycle_count) {
				dailyStats[dateStr] ??= { date, cars: 0, people: 0, bicycles: 0 };
				dailyStats[dateStr].cars += event.car_count ?? 0;
				dailyStats[dateStr].bicycles += event.bicycle_count ?? 0;
				dailyStats[dateStr].people += event.people_count ?? 0;
			}
		});

		const formatTitle = ({ key, low, high, cars, people, bicycles }: Record<string, any>) => {
			if (typeof low === 'number') {
				return [
					`${formatNumber({ key, value: low })}`,
					`${formatNumber({ key, value: high })}°C`
				].join('/');
			}

			if (typeof cars === 'number') {
				return [
					`${$_('car_count')}: ${cars}`,
					`${$_('bicycle_count')}: ${bicycles}`,
					`${$_('people_count')}: ${people}`
				].join('<br>');
			}

			return '';
		};

		// Create calendar events with daily highs and lows
		return Object.values(dailyStats).map(({ date, ...rest }) => ({
			id: date,
			start: date,
			end: date,
			allDay: true,
			// HTML is allowed https://www.npmjs.com/package/@event-calendar/core#content
			title: { html: formatTitle(rest) },
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
		//console.log('Requested range:', finalStartDate, finalEndDate, 'Received:', newData);
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

<Header {device} {basePath}>
	{#snippet controls()}
		<CsvDownloadButton {devEui} />
		<Button class="invisible" variant="secondary" href="{basePath}/settings">{$_('report')}</Button>
		<Button variant="secondary" href="{basePath}/settings">{$_('settings')}</Button>
	{/snippet}
	<div class="flex flex-wrap items-end gap-4 sm:flex-row-reverse">
		<!-- Date range selector -->
		<div class="flex flex-wrap items-end gap-2">
			<!-- Date inputs -->
			<div class="flex flex-col">
				<label for="startDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400">
					{$_('Start Date:')}
				</label>
				<TextInput
					id="startDate"
					type="date"
					bind:value={startDateInputString}
					max={endDateInputString}
					class="text-sm"
				/>
			</div>
			<div class="flex flex-col">
				<label for="endDate" class="mb-1 text-xs text-gray-600 dark:text-gray-400">
					{$_('End Date:')}
				</label>
				<TextInput
					id="endDate"
					type="date"
					bind:value={endDateInputString}
					min={startDateInputString}
					max={new Date().toISOString().split('T')[0]}
					class="text-sm"
				/>
			</div>
			<div class="-ml-2">
				<Button
					variant="ghost"
					iconic
					onclick={handleDateRangeSubmit}
					disabled={loadingHistoricalData}
				>
					<MaterialIcon name="refresh" aria-label={$_('refresh')} />
				</Button>
			</div>
			{#if error}
				<p class="mt-2 text-sm text-red-600">{'error'}</p>
			{/if}
		</div>
	</div>
</Header>

<div class="flex flex-col gap-4 p-4 lg:flex-row">
	<!-- Left pane -->
	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:w-[320px] lg:grid-cols-1 lg:flex-col lg:gap-6"
	>
		<!-- Latest data section -->
		<section class="flex-auto lg:w-auto lg:flex-none">
			<h2>{$_('Latest Sensor Readings')}</h2>
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

					<p class="mt-2 text-right text-sm text-gray-500 italic opacity-70 dark:text-gray-400">
						{$_('Last updated:')}
						{formatDateForDisplay(latestData.created_at)}
					</p>
				</div>
			{:else}
				<p class="pt-4 text-center text-gray-500 italic">{$_('No recent data available')}</p>
			{/if}
		</section>

		<!-- Video Feed is IP is there -->
		<section class="flex-none {device?.ip_log.length > 0 ? 'visible' : 'invisible'}">
			<h2>{$_('Camera Stream')}</h2>
			{#if device?.ip_log.length > 0}
				{#each device.ip_log as log}
					<img
						class="sc-hHOBiw eJjIgh"
						src="https://153.137.8.13:2223/mjpg/video.mjpg?camera=1&amp;audiocodec=aac&amp;audiosamplerate=16000&amp;audiobitrate=32000&amp;videozprofile=classic&amp;timestamp=0&amp;cachebust=1"
						alt="Camera Stream"
					/>
				{/each}
			{:else}
				<p class="pt-4 text-center text-gray-500 italic">{$_('No stream available')}</p>
			{/if}
		</section>

		{#if device}
			<section class="flex-none">
				<h2>{$_('Map')}</h2>
				<div class="aspect-square">
					<LeafletMap
						lat={device.lat || 0}
						lon={device.long || 0}
						zoom={17}
						markers={[[device.lat || 0, device.long || 0]]}
					/>
				</div>
			</section>
		{/if}

		<!-- Device metadata container -->
		<section class="flex-none">
			<h2>{$_('Device Info')}</h2>
			<div class="rounded-lg bg-gray-50 p-4 shadow-sm dark:bg-zinc-800">
				<!-- Responsive: 1 col on mobile, 2 on md, 4 on lg -->
				<div class="grid grid-rows-1 gap-2 text-sm">
					<!-- Type -->
					<div>
						<span class="text-gray-500/80 dark:text-gray-300/80">{$_('Type:')}</span>
						<span class="ml-1 break-words text-gray-900 dark:text-white">{deviceTypeName}</span>
					</div>

					<!-- EUI -->
					<div>
						<span class="text-gray-500/80 dark:text-gray-300/80">{$_('EUI:')}</span>
						<span class="ml-1 break-words text-gray-900 dark:text-white">{device.dev_eui}</span>
					</div>

					<!-- Location ID -->
					{#if device?.location_id}
						<div>
							<span class="text-gray-500/80 dark:text-gray-300/80">{$_('Location ID:')}</span>
							<span class="ml-1 text-gray-900 dark:text-white">{device.location_id}</span>
						</div>
					{/if}

					<!-- Installed At -->
					{#if device?.installed_at}
						<div>
							<span class="text-gray-500/80 dark:text-gray-300/80">{$_('Installed:')}</span>
							<span class="ml-1 text-gray-900 dark:text-white">
								{formatDateOnly(device.installed_at)}
							</span>
						</div>
					{/if}

					<div>
						<a
							href="https://kb.cropwatch.io/doku.php?id=co2_sensors"
							target="_blank"
							class="text-gray-500/80 dark:text-gray-300/80"
						>
							{$_('Sensor Datasheet')}
						</a>
					</div>
				</div>
			</div>
		</section>
	</div>

	<!-- Right pane -->
	<div
		class="relative flex-1 border-t-1 border-neutral-400 pt-4 lg:border-t-0 lg:pt-0"
		inert={loadingHistoricalData}
		aria-busy={loadingHistoricalData}
	>
		<!-- Loading overlay -->
		{#if loadingHistoricalData}
			<div
				class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-50 backdrop-blur-xs dark:bg-zinc-900/75"
			>
				<Spinner />
				{$_('Loading historical data...')}
			</div>
		{/if}
		<section class="mb-12">
			{#if loading}
				<!-- Loading State -->
				<div
					class="flex flex-col items-center justify-center gap-2 rounded-lg bg-gray-50 p-8 shadow dark:bg-zinc-800"
				>
					<Spinner />
					<p class="text-gray-700 dark:text-gray-300">{$_('Loading historical data...')}</p>
				</div>
			{:else if historicalData.length === 0}
				<!-- Empty State -->
				<div class="pt-4 text-center text-gray-500 italic">
					{$_('No historical data available for the selected date range.')}
				</div>
			{:else}
				<!-- Statistical Summary -->
				<div class="mb-8">
					<h2>{$_('Stats Summary')}</h2>
					<div class="flex flex-col gap-4 sm:grid-cols-1 md:grid-cols-2 md:flex-row lg:grid-cols-3">
						{#if temperatureChartVisible}
							<StatsCard key="temperature_c" {stats} />
						{/if}
						{#if humidityChartVisible}
							<StatsCard key="humidity" {stats} />
						{/if}
						{#if moistureChartVisible}
							<StatsCard key="moisture" {stats} />
						{/if}
						{#if co2ChartVisible}
							<StatsCard key="co2" {stats} />
						{/if}
						{#if phChartVisible}
							<StatsCard key="ph" {stats} />
						{/if}
					</div>
				</div>

				<!-- Charts -->
				<!-- Chart Visualizations -->
				<section class="mb-12" inert={renderingVisualization} aria-busy={renderingVisualization}>
					<h2>{$_('Data Chart')}</h2>

					<!-- Generic Main Line + Brush Chart (always rendered if historicalData exists) -->
					<div class="relative mb-10 rounded-lg bg-gray-50 p-4 shadow dark:bg-zinc-800">
						{#if renderingVisualization}
							<div class="absolute inset-0 z-10 flex items-center justify-center">
								Rendering chart...
							</div>
						{/if}
						<h4
							class="mb-4 text-center text-base text-xl font-medium text-gray-800 dark:text-gray-200"
							hidden={renderingVisualization}
						>
							{$_('All Sensor Data Over Time')}
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
				<h2>{$_('Weather & Data')}</h2>
				<WeatherCalendar
					events={calendarEvents}
					onDateChange={(date: Date) => {
						startDateInputString = formatDateForInput(date);
						endDateInputString = formatDateForInput(deviceDetail.endDate);
						handleDateRangeSubmit();
					}}
				/>
			</section>
		</div>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";

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

		.chart {
			width: 100%;
		}

		/* These classes are critical for ApexCharts rendering size */
		.main-chart {
			height: 350px;
		}

		.brush-chart {
			height: 150px;
			margin-top: 10px;
		}

		:global {
			.apexcharts-legend-series {
				@apply gap-1;
			}

			.apexcharts-legend-text {
				@apply !text-gray-500;

				.dark & {
					@apply !text-gray-400;
				}
			}

			text {
				@apply fill-gray-500;

				.dark & {
					@apply fill-gray-400;
				}
			}
		}
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

	h2 {
		@apply mb-2 text-xl font-semibold text-gray-600;

		:global(.dark) & {
			@apply text-gray-300;
		}
	}
</style>
