<script lang="ts">
	import { page } from '$app/state';
	import CameraStream from '$lib/components/dashboard/CameraStream.svelte';
	import DateRangeSelector from '$lib/components/dashboard/DateRangeSelector.svelte';
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
	import { onMount, untrack } from 'svelte';
	import { _, locale } from 'svelte-i18n';
	import type { PageProps } from './$types';
	import { setupDeviceDetail } from './device-detail.svelte';
	import Header from './Header.svelte';
	import { setupRealtimeSubscription } from './realtime.svelte';
	import RelayControl from '$lib/components/RelayControl.svelte';
	import { browser } from '$app/environment';
	import { createActiveTimer } from '$lib/utilities/ActiveTimer';

	// Get device data from server load function
	let { data }: PageProps = $props();

	let { location_id, devEui } = page.params;
	let basePath = `/app/dashboard/location/${location_id}/devices/${devEui}`;
	let device = $state(data.device as DeviceWithType);
	let latestData: DeviceDataRecord | null = $state(null);
	let historicalData: DeviceDataRecord[] = $state([]);
	let userId = $state(data.user.id); // User ID for permissions
	interface DeviceOwnerPerm {
		user_id: string;
		permission_level: number;
	}
	let devicePermissionLevelState = $state<DeviceOwnerPerm[]>(
		// @ts-ignore allow fallback if structure differs
		(data.device as any)?.cw_device_owners || []
	);
	let devicePermissionLevel = $derived<number | null>(
		devicePermissionLevelState.find((owner: DeviceOwnerPerm) => owner.user_id === userId)
			?.permission_level ?? null
	);

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

	// Date range selection - initialize in LOCAL time (end: today 23:59:59.999, start: end - 24h)
	const __endInit = new Date();
	__endInit.setHours(23, 59, 59, 999);
	let endDateInput = $state<Date>(__endInit);
	let startDateInput = $state<Date>(new Date(__endInit.getTime() - 24 * 60 * 60 * 1000));

	let loadingHistoricalData = $state(false); // Local loading state for historical data fetch
	let renderingVisualization = $state(false); // Local rendering state for visualization

	// Derived properties
	// const {
	// 	deviceTypeName,
	// 	temperatureChartVisible,
	// 	humidityChartVisible,
	// 	moistureChartVisible,
	// 	co2ChartVisible,
	// 	phChartVisible
	// } = $derived(getDeviceDetailDerived(device, dataType, latestData));
	let channel: RealtimeChannel | undefined = $state(undefined); // Channel for realtime updates
	// Track last realtime update timestamp for stale detection
	let lastRealtimeUpdate = $state<number>(Date.now());
	let staleCheckIntervalId: number | null = $state(null);
	let wakeDetectorIntervalId: number | null = $state(null);
	let lastWakeTick = $state<number>(Date.now());
	const EXPECTED_UPLOAD_MINUTES = $derived(
		device.upload_interval || device.cw_device_type?.default_upload_interval || 10
	);
	const STALE_THRESHOLD_MS = $derived(
		// Previously capped at 30 min and multiplied by 2. Now strictly use configured interval (in minutes) with no hard cap.
		EXPECTED_UPLOAD_MINUTES * 60 * 1000
	);

	// Active status timer for THIS device (independent of dashboard list)
	let activeTimerStore: ReturnType<typeof createActiveTimer> | null = null;
	let isDeviceActiveFlag = $state<boolean | null>(null);
	function setupActiveTimer() {
		if (!latestData?.created_at) return;
		const intervalMin = EXPECTED_UPLOAD_MINUTES;
		activeTimerStore = createActiveTimer(new Date(latestData.created_at), intervalMin);
		activeTimerStore.subscribe((val) => (isDeviceActiveFlag = val));
	}

	// Rebuild timer whenever latestData timestamp changes
	$effect(() => {
		if (latestData?.created_at) {
			setupActiveTimer();
		}
	});

	async function fetchLatestDirect(reason: string) {
		try {
			// console.debug('[DeviceDetail] Fetching latest (reason=%s)', reason);
			const resp = await fetch(`/api/devices/${devEui}/status`);
			if (resp.ok) {
				const latest = await resp.json();
				if (!latestData || latest.created_at !== latestData.created_at) {
					latestData = latest;
					lastRealtimeUpdate = Date.now();
				}
			} else {
				console.warn('[DeviceDetail] Failed to refresh latest data', resp.status);
			}
		} catch (e) {
			console.error('[DeviceDetail] Error fetching latest', e);
		}
	}

	function setupRealtime() {
		if (channel || !device.cw_device_type?.data_table_v2) return;
		channel = setupRealtimeSubscription(
			data.supabase,
			device.cw_device_type?.data_table_v2,
			devEui,
			(newData) => {
				latestData = newData;
				lastRealtimeUpdate = Date.now();
			},
			0
		);
	}

	function teardownRealtime() {
		if (channel) {
			data.supabase.removeChannel(channel);
			channel = undefined;
		}
	}

	function setupStaleMonitoring() {
		if (!browser) return;
		if (staleCheckIntervalId) return;
		staleCheckIntervalId = window.setInterval(() => {
			const now = Date.now();
			if (now - lastRealtimeUpdate > STALE_THRESHOLD_MS) {
				fetchLatestDirect('stale-check');
			}
		}, 60 * 1000); // check every minute
	}

	function setupWakeDetector() {
		if (!browser) return;
		if (wakeDetectorIntervalId) return;
		wakeDetectorIntervalId = window.setInterval(() => {
			const now = Date.now();
			const delta = now - lastWakeTick;
			lastWakeTick = now;
			// If the tab/computer was asleep, delta will be large (e.g., > 90s)
			if (delta > 90 * 1000) {
				// console.debug('[DeviceDetail] Wake detected (delta=%dms)', delta);
				// Recreate realtime channel and force refresh
				teardownRealtime();
				setupRealtime();
				fetchLatestDirect('wake');
			}
		}, 30 * 1000); // tick every 30s
	}

	function setupVisibilityHandlers() {
		if (!browser) return;
		function handleVisibility() {
			if (document.visibilityState === 'visible') {
				setupRealtime();
				fetchLatestDirect('visibility');
			} else {
				// pause realtime to save resources
				teardownRealtime();
			}
		}
		window.addEventListener('visibilitychange', handleVisibility);
		window.addEventListener('focus', () => fetchLatestDirect('focus'));
		window.addEventListener('online', () => {
			teardownRealtime();
			setupRealtime();
			fetchLatestDirect('online');
		});
		// Cleanup registration
		return () => {
			window.removeEventListener('visibilitychange', handleVisibility);
			window.removeEventListener('focus', () => fetchLatestDirect('focus'));
			window.removeEventListener('online', () => fetchLatestDirect('online'));
		};
	}

	let removeVisibilityHandlers: (() => void) | null | undefined = null;

	onMount(() => {
		// Initialize the device detail date range (this might be used internally by deviceDetail)
		initializeDateRange(); // This sets deviceDetail.startDate and deviceDetail.endDate (Date objects)
	});

	$effect(() => {
		if (device.cw_device_type?.data_table_v2 && !channel) {
			setupRealtime();
			setupStaleMonitoring();
			setupWakeDetector();
			if (!removeVisibilityHandlers) {
				removeVisibilityHandlers = setupVisibilityHandlers() || null;
			}
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

	$effect(() => {
		// Initialize latestData from the streamed promise once
		if (latestData === null && data.latestData) {
			(async () => {
				try {
					const _latest = await data.latestData;
					if (_latest) {
						latestData = _latest as DeviceDataRecord;
					} else if (historicalData.length) {
						// Fallback: use most recent historical record if available
						latestData = historicalData[historicalData.length - 1];
					}
				} catch (e) {
					console.error('Failed to resolve latestData promise:', e);
				}
			})();
		}
	});

	$effect(() => {
		if (latestData === null && historicalData.length) {
			latestData = historicalData[historicalData.length - 1];
		}
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
		if (!startDateInput || !endDateInput) {
			deviceDetail.error = 'Please select both start and end dates.';
			return;
		}

		loadingHistoricalData = true;

		try {
			const newData = await fetchDataForDateRange(device, startDateInput, endDateInput);
			if (newData) {
				historicalData = newData; // Set the historical data
				processHistoricalData(newData); // Process the new data to update stats and chartData
				numericKeys = getNumericKeys(newData); // Update numeric keys for the new data
				calendarEvents = updateEvents(newData); // Use newData directly
			} else {
				calendarEvents = updateEvents(historicalData);
			}
		} catch (error) {
			console.error('Error fetching date range data:', error);
			deviceDetail.error = 'Failed to fetch data for the selected date range.';
		} finally {
			loadingHistoricalData = false;
		}
	}

	// Expose formatDateForDisplay for the template, aliased from helpers
	const formatDateForDisplay = utilFormatDateForDisplay;

	// Cleanup on destroy
	import { onDestroy } from 'svelte';
	import BatteryLevel from '$lib/components/BatteryLevel.svelte';
	import DataTable from '$lib/components/DataTable.svelte';
	onDestroy(() => {
		teardownRealtime();
		if (staleCheckIntervalId) clearInterval(staleCheckIntervalId);
		if (wakeDetectorIntervalId) clearInterval(wakeDetectorIntervalId);
		if (removeVisibilityHandlers) removeVisibilityHandlers();
	});
</script>

<svelte:head>
	<title>Device Details - {device?.name || device?.dev_eui}</title>
</svelte:head>

<Header {device} {basePath}>
	{#if device.battery_level !== null}
		<BatteryLevel value={device.battery_level} size={28} showLabel />
	{/if}

	<!-- Data range selector on large screen -->
	<div class="hidden border-r border-neutral-400 pl-4 lg:block">
		<DateRangeSelector
			bind:startDateInput
			bind:endDateInput
			{loadingHistoricalData}
			onDateChange={handleDateRangeSubmit}
		/>
	</div>
	<div class="flex w-full justify-end gap-2 md:w-auto">
		{#if (numericKeys.length && device.user_id == userId) || (devicePermissionLevel !== null && devicePermissionLevel <= 2)}
			<ExportButton
				{devEui}
				startDateInputString={startDateInput.toDateString()}
				endDateInputString={endDateInput.toDateString()}
				dataKeys={numericKeys}
			/>
		{/if}
		<!-- <pre>{JSON.stringify(device, null, 2)}</pre> -->
		{#if device.user_id == userId || devicePermissionLevel === 1}
			<Button variant="secondary" href="{basePath}/settings">
				<MaterialIcon name="Settings" />
				{$_('settings')}
			</Button>
		{/if}
	</div>
</Header>

<!-- Updated layout: outer wrapper always column; inner two-column row contains latest + stats; charts moved below for full-width -->
<div class="wrapper flex flex-col gap-4 p-4">
	<div class="flex flex-col gap-4 lg:flex-row">
		<!-- Left pane -->
		<div
			class="stats-column grid grid-cols-1 gap-4 sm:grid-cols-1 lg:flex lg:w-[320px] lg:grid-cols-1 lg:flex-col lg:gap-6"
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
			<!-- <DeviceMap {device} class="hidden flex-none lg:block" /> -->
		</div>

		<!-- Right pane (now only summary + calendar) -->
		<div
			class="relative flex-1 border-t-1 border-neutral-400 pt-4 lg:border-t-0 lg:pt-0"
			inert={loadingHistoricalData}
			aria-busy={loadingHistoricalData}
		>
			{#if loadingHistoricalData}
				<div
					class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-gray-50 backdrop-blur-xs dark:bg-zinc-900/75"
				>
					<Spinner />
					{$_('Loading historical data...')}
				</div>
			{/if}
			<div class="mb-4 border-b border-neutral-400 pb-4 lg:hidden">
				<DateRangeSelector
					bind:startDateInput
					bind:endDateInput
					{loadingHistoricalData}
					onDateChange={handleDateRangeSubmit}
				/>
			</div>
			<section class="mb-12">
				{#if loading}
					<div class="panel flex flex-col items-center justify-center gap-2 rounded-lg p-8 shadow">
						<Spinner />
						<p class="text-gray-700 dark:text-gray-300">{$_('Loading historical data...')}</p>
					</div>
				{:else if historicalData.length === 0 && device.cw_device_type?.data_table_v2 !== 'cw_relay_data'}
					<div class="pt-4 text-center text-gray-500 italic">
						{$_('No historical data available for the selected date range.')}
					</div>
				{:else if device.cw_device_type?.data_table_v2 === 'cw_relay_data'}
					<RelayControl {device} {latestData} />
				{:else}
					<div class="mb-8">
						<h2>{$_('Stats Summary')}</h2>

						<!-- Auto-fit makes items expand when a row isn't full -->
						<div
							class="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] items-stretch gap-4 md:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]
      xl:grid-cols-[repeat(auto-fit,minmax(340px,1fr))]
    "
						>
							{#each numericKeys as key (key)}
								{#if stats[key]}
									<StatsCard {stats} {key} class="h-full w-full" />
								{/if}
							{/each}
						</div>
					</div>
				{/if}
			</section>

			<!-- Video feed and map on small/medium screen -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:hidden">
				<CameraStream {device} />
				<!-- <DeviceMap {device} /> -->
			</div>
		</div>
	</div>
</div>

<!-- Full-width Charts Section (desktop + mobile) -->
{#if !loading && !loadingHistoricalData && historicalData.length > 0}
	<section class="mb-12 px-4" inert={renderingVisualization} aria-busy={renderingVisualization}>
		<h2>{$_('Data Chart')}</h2>
		<div class="panel relative mb-10 rounded-lg p-4 shadow">
			{#if renderingVisualization}
				<div class="absolute inset-0 z-10 flex items-center justify-center">Rendering chart...</div>
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

<!-- Full-width Calendar Section -->
<section class="mb-12 px-4">
	{#if device.cw_device_type?.data_table_v2 === 'cw_air_data'}
		<DataTable {historicalData} />
	{:else if device.cw_device_type?.data_table_v2 === 'traffic_v2'}
		<h2>{$_('Weather & Data')}</h2>
		<WeatherCalendar events={calendarEvents} />
	{:else}
		<!-- nop -->
	{/if}
</section>

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
