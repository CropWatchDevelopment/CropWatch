<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import type { DeviceWithType } from '$lib/models/Device';

	import type { PageProps } from './$types';
	import { getDeviceDetailDerived, setupDeviceDetail } from './device-detail.svelte';
	import DataCard from '$lib/components/DataCard/DataCard.svelte';
	import StatsCard from '$lib/components/StatsCard/StatsCard.svelte';
	import { goto } from '$app/navigation';

	// Get device data from server load function
	let { data }: PageProps = $props();

	let user = $state(data.user);
	let device = $state(data.device as DeviceWithType);
	let dataType = $state(data.dataType);
	let latestData = $state(data.latestData);
	let historicalData = $state(data.historicalData || []);

	// Setup device detail functionality
	const deviceDetail = setupDeviceDetail();

	// Extract values from setup function - make the DOM-bound elements mutable
	const {
		stats,
		chartData,
		loading,
		error,
		formatDateForDisplay,
		hasValue,
		processHistoricalData,
		fetchDataForDateRange,
		renderVisualization,
		initializeDateRange
	} = deviceDetail;

	// Define these as element references - using the new Svelte 5 approach for DOM bindings
	// For DOM elements that don't need reactivity, we can use let declarations without $state
	let chart1: HTMLElement;
	let chart1Brush: HTMLElement;
	let dataGrid: HTMLElement;

	// Get the other properties that don't need DOM binding
	let { startDate, endDate } = $state(deviceDetail);

	// Derived properties
	const derived = $state(getDeviceDetailDerived(device, dataType, latestData));
	const deviceTypeName = $state(derived.deviceTypeName);
	const temperatureChartVisible = $state(derived.temperatureChartVisible);
	const humidityChartVisible = $state(derived.humidityChartVisible);
	const moistureChartVisible = $state(derived.moistureChartVisible);
	const co2ChartVisible = $state(derived.co2ChartVisible);
	const phChartVisible = $state(derived.phChartVisible);

	// Initialize the component
	onMount(() => {
		initializeDateRange();
		processHistoricalData(historicalData, dataType);
	});

	// Effect to re-render visualization when historical data changes
	$effect(() => {
		// Pass the DOM elements to the renderVisualization function
		renderVisualization(historicalData, dataType, latestData);
	});

	// Function to handle fetching data for a specific date range
	async function handleDateRangeSubmit() {
		const newData = await fetchDataForDateRange(device);
		if (newData && newData.length > 0) {
			historicalData = newData;
			processHistoricalData(historicalData, dataType);
		}
	}
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
							{new Date(device.installed_at).toLocaleDateString()}
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
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#each Object.keys(latestData) as key}
						{#if key === 'created_at'}
							<DataCard
								{latestData}
								name={key}
								{key}
								type={key}
								notation={key === 'created_at' || key === 'dev_eui' ? '' : '°C'}
								metadata={key === 'created_at' || key === 'dev_eui'}
								class="w-full"
							/>
						{/if}

						{#if key !== 'created_at'}
							<DataCard
								{latestData}
								name={key}
								{key}
								type={key}
								notation={key === 'created_at' || key === 'dev_eui' ? '' : '°C'}
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

	<!-- Historical data section -->

	<section class="mb-12">
		<h2 class="mb-6 text-lg font-semibold text-gray-900 dark:text-gray-100">Historical Data</h2>

		<div class="mb-6 rounded-lg bg-gray-50 p-4 dark:bg-zinc-800">
			<div class="flex flex-wrap items-end gap-4">
				<div class="flex flex-col">
					<label class="mb-1 text-sm">Start Date:</label>
					<input
						type="date"
						bind:value={startDate}
						max={endDate}
						class="rounded border border-gray-300 bg-white p-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
					/>
				</div>

				<div class="flex flex-col">
					<label class="mb-1 text-sm">End Date:</label>
					<input
						type="date"
						bind:value={endDate}
						min={startDate}
						class="rounded border border-gray-300 bg-white p-2 text-sm dark:border-zinc-600 dark:bg-zinc-700"
					/>
				</div>

				<button
					onclick={handleDateRangeSubmit}
					class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
					disabled={loading}
				>
					{loading ? 'Loading…' : 'Fetch Data'}
				</button>
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
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{#if temperatureChartVisible}
						<StatsCard
							notation="°C"
							title="Temperature"
							min={stats.temperature.min}
							max={stats.temperature.max}
							avg={stats.temperature.avg}
						/>
					{/if}
					{#if humidityChartVisible}
						<StatsCard
							notation="%"
							title="Humidity"
							min={stats.humidity.min}
							max={stats.humidity.max}
							avg={stats.humidity.avg}
						/>
					{/if}
					{#if moistureChartVisible}
						<StatsCard
							notation="%"
							title="Moisture"
							min={stats.moisture.min}
							max={stats.moisture.max}
							avg={stats.moisture.avg}
						/>
					{/if}
					{#if co2ChartVisible}
						<StatsCard
							title="CO₂ (ppm)"
							min={stats.co2.min}
							max={stats.co2.max}
							avg={stats.co2.avg}
						/>
					{/if}
					{#if phChartVisible}
						<StatsCard title="pH" min={stats.ph.min} max={stats.ph.max} avg={stats.ph.avg} />
					{/if}
				</div>
			</div>

			<!-- Charts -->
			<!-- Chart Visualizations -->
			<div class="mb-12">
				<h3 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
					Data Visualization
				</h3>

				<!-- Main Line + Brush Chart -->
				{#if temperatureChartVisible}
					<div class="mb-10 rounded-lg bg-white p-4 shadow dark:bg-zinc-900">
						<h4 class="mb-4 text-center text-base font-medium text-gray-800 dark:text-gray-200">
							Sensor Data Over Time
						</h4>

						<!-- Chart grows to full width, no scrollbars -->
						<div class="w-full">
							<div class="chart-placeholder">
								<div class="chart-visual">
									<div class="chart main-chart" bind:this={chart1}></div>
									<div class="chart brush-chart" bind:this={chart1Brush}></div>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Individual Chart Stats -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					{#if humidityChartVisible || moistureChartVisible}
						<div class="rounded-lg bg-white p-4 shadow dark:bg-zinc-900">
							<h4 class="mb-2 text-base font-medium text-gray-800 dark:text-gray-200">
								{dataType === 'air' ? 'Humidity' : 'Moisture'} Statistics
							</h4>
							<div class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
								{#if humidityChartVisible}
									<p>Min: {stats.humidity.min}%</p>
									<p>Avg: {stats.humidity.avg}%</p>
									<p>Max: {stats.humidity.max}%</p>
								{:else}
									<p>Min: {stats.moisture.min}%</p>
									<p>Avg: {stats.moisture.avg}%</p>
									<p>Max: {stats.moisture.max}%</p>
								{/if}
							</div>
						</div>
					{/if}

					{#if temperatureChartVisible}
						<div class="rounded-lg bg-white p-4 shadow dark:bg-zinc-900">
							<h4 class="mb-2 text-base font-medium text-gray-800 dark:text-gray-200">
								Temperature Statistics
							</h4>
							<div class="space-y-1 text-sm text-gray-700 dark:text-gray-300">
								<p>Min: {stats.temperature.min}°C</p>
								<p>Avg: {stats.temperature.avg}°C</p>
								<p>Max: {stats.temperature.max}°C</p>
							</div>
						</div>
					{/if}

					<!-- If you want to render CO₂ or pH here, you can add similar blocks -->
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
	.apexcharts-canvas {
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
	}

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
