<script lang="ts">
	import { page } from '$app/state';
	import CameraStream from '$lib/components/dashboard/CameraStream.svelte';
	import DateRangeSelector from '$lib/components/dashboard/DateRangeSelector.svelte';
	import DeviceMap from '$lib/components/dashboard/DeviceMap.svelte';
	import DataCard from '$lib/components/DataCard/DataCard.svelte';
	import ExportButton from '$lib/components/devices/ExportButton.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import StatsCard from '$lib/components/StatsCard/StatsCard.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import WeatherCalendar from '$lib/components/WeatherCalendar.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { DeviceDataRecord } from '$lib/models/DeviceDataRecord';
	import {
		formatDateForInput,
		formatDateForDisplay as utilFormatDateForDisplay
	} from '$lib/utilities/helpers';
	import { formatNumber, getNumericKeys } from '$lib/utilities/stats';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import { DateTime } from 'luxon';
	import { onMount, untrack } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import { getDeviceDetailDerived, setupDeviceDetail } from './device-detail.svelte';
	import Header from './Header.svelte';
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

	let numericKeys: string[] = $state([]); // Holds numeric keys from historical data
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
	let mainChartElements: HTMLElement[] = $state([]); // Holds chart elements for rendering
	let blushChartElements: HTMLElement[] = $state([]); // Holds brush elements for rendering

	// Local string states for date inputs, bound to the input fields
	let startDateInputString = $state('');
	let endDateInputString = $state('');

	let loadingHistoricalData = $state(false); // Local loading state for historical data fetch
	let renderingVisualization = $state(false); // Local rendering state for visualization

	// Derived properties
	const {
		deviceTypeName,
		temperatureChartVisible,
		humidityChartVisible,
		moistureChartVisible,
		co2ChartVisible,
		phChartVisible
	} = $derived(getDeviceDetailDerived(device, dataType, latestData));
	let channel: RealtimeChannel | undefined = $state(undefined); // Channel for realtime updates

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
		if (device.cw_device_type?.data_table_v2 && !channel) {
			channel = setupRealtimeSubscription(
				data.supabase,
				device.cw_device_type?.data_table_v2,
				devEui,
				(newData) => {
					latestData = newData;
				},
				0 // Retry count starts at 0
			);
		}
	});

	$effect(() => {
		(async () => {
			loadingHistoricalData = true;

			const _historicalData = await data.historicalData;

			processHistoricalData(_historicalData); // Initial processing of server-loaded data
			historicalData = _historicalData; // Set historical data state
			numericKeys = getNumericKeys(historicalData);
			calendarEvents = updateEvents(); // Initialize calendar events based on historical data
			loadingHistoricalData = false;
		})();
	});

	const renderChart = async () => {
		if (renderingVisualization || !numericKeys.length) {
			return;
		}

		renderingVisualization = true;

		await Promise.all(
			numericKeys.map((key, index) =>
				renderVisualization({
					historicalData,
					chart1Element: mainChartElements[index],
					chart1BrushElement: blushChartElements[index],
					key
				})
			)
		);

		renderingVisualization = false;
	};

	// Re-render chart when historical data changes
	$effect(() => {
		void [$locale, historicalData];

		untrack(() => {
			renderChart();
		});
	});

	// Re-render chart and calendar when the app locale changes, because the labels depend on it
	$effect(() => {
		void $locale;
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
	async function handleDateRangeSubmit(units?: number) {
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

		// If units is provided, slide the date range forward or backward
		if (units !== undefined) {
			//get range between start and end dates
			let endDateTime = DateTime.fromJSDate(finalEndDate);
			let startDateTime = DateTime.fromJSDate(finalStartDate);
			const diffInDays = Math.round(Math.abs(startDateTime.diff(endDateTime, ['days']).days));
			if (units < 0) {
				// Slide back
				startDateTime = startDateTime.minus({ days: diffInDays });
				endDateTime = endDateTime.minus({ days: diffInDays });
			} else if (units > 0) {
				// Slide forward
				startDateTime.plus({ days: diffInDays }).toJSDate();
				endDateTime.plus({ days: diffInDays }).toJSDate();
			}
			// update input strings to reflect the new range
			startDateInputString = formatDateForInput(startDateTime.toJSDate());
			endDateInputString = formatDateForInput(endDateTime.toJSDate());
		}

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
	<div class="flex w-full justify-end gap-2 md:w-auto">
		{#if numericKeys.length}
			<ExportButton {devEui} {startDateInputString} {endDateInputString} dataKeys={numericKeys} />
		{/if}
		<Button variant="secondary" href="{basePath}/settings">
			<MaterialIcon name="Settings" />
			{$_('settings')}
		</Button>
	</div>
	<!-- Data range selector on large screen -->
	<div class="hidden border-l border-neutral-400 pl-4 lg:block">
		<DateRangeSelector
			{startDateInputString}
			{endDateInputString}
			{handleDateRangeSubmit}
			{loadingHistoricalData}
		/>
	</div>
</Header>

<div class="wrapper flex flex-col gap-4 p-4 lg:flex-row">
	<!-- Left pane -->
	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-1 lg:flex lg:w-[320px] lg:grid-cols-1 lg:flex-col lg:gap-6"
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

		<!-- Video feed and map on large screen -->
		<CameraStream {device} class="hidden flex-none lg:block" />
		<DeviceMap {device} class="hidden flex-none lg:block" />
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
		<!-- Data range selector on small/medium screen -->
		<div class="mb-4 border-b border-neutral-400 pb-4 lg:hidden">
			<DateRangeSelector
				{startDateInputString}
				{endDateInputString}
				{handleDateRangeSubmit}
				{loadingHistoricalData}
			/>
		</div>
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
						<div class="w-full">
							<div class="chart-placeholder grid grid-cols-1 gap-4 md:grid-cols-2">
								{#each numericKeys as key, index (key)}
									<section class="chart-visual">
										<h3 class="text-center font-semibold">{$_(key)}</h3>
										<div class="chart main-chart" bind:this={mainChartElements[index]}></div>
										<div class="chart brush-chart" bind:this={blushChartElements[index]}></div>
									</section>
								{/each}
							</div>
						</div>
					</div>
				</section>
			{/if}
		</section>

		<!-- Video feed and map on small/medium screen -->
		<div class="grid grid-cols-1 md:grid-cols-2 lg:hidden">
			<CameraStream {device} />
			<DeviceMap {device} />
		</div>

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
			height: 200px;
		}

		.brush-chart {
			height: 100px;
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

	.wrapper {
		:global {
			h2 {
				@apply mb-2 text-xl font-semibold text-gray-600;

				:global(.dark) & {
					@apply text-gray-300;
				}
			}
		}
	}
</style>
