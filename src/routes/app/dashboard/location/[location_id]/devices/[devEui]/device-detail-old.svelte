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

<div class="device-details-container">
	<div class="device-header">
		<div class="back-link">
			<a href="/app/dashboard">&larr; Back to Dashboard</a>
		</div>
		<h1>{device?.name || 'Device'} Details</h1>
		<div class="device-meta">
			<p>Type: <span class="device-type">{deviceTypeName}</span></p>
			<p>EUI: <span class="device-eui">{device?.dev_eui}</span></p>
			{#if device?.location_id}
				<p>Location ID: <span class="device-location">{device.location_id}</span></p>
			{/if}
			{#if device?.installed_at}
				<p>
					Installed: <span class="device-installed"
						>{new Date(device.installed_at).toLocaleDateString()}</span
					>
				</p>
			{/if}
		</div>
		<button onclick={() => goto(`${device?.dev_eui}/settings`)}>⚙️ Settings</button>
	</div>

	<!-- Latest data section -->
	<section class="data-section latest-data bg-foreground-light dark:bg-foreground-dark">
		<h2>{$_('Latest Sensor Readings')}</h2>
		{#if latestData}
			<div class="sensor-readings">
				<div class="grid grid-cols-3 gap-4">
					{#each Object.keys(latestData) as key}
						<DataCard {latestData} name={key} {key} notation="°C" type={key} class="w-full" />
					{/each}
				</div>
				<p class="timestamp">Last updated: {new Date(latestData.created_at).toLocaleString()}</p>
			</div>
		{:else}
			<p class="no-data">No recent data available for this device.</p>
		{/if}
	</section>

	<!-- Historical data section -->
	<section class="data-section historical-data bg-foreground-light dark:bg-foreground-dark">
		<h2>Historical Data</h2>

		<div class="date-range-selector bg-card-light dark:bg-card-dark mb-6 rounded-lg p-4 shadow">
			<div class="date-inputs">
				<div class="form-group">
					<label for="startDate">Start Date:</label>
					<input type="date" id="startDate" bind:value={startDate} max={endDate} />
				</div>
				<div class="form-group">
					<label for="endDate">End Date:</label>
					<input type="date" id="endDate" bind:value={endDate} min={startDate} />
				</div>
				<button class="fetch-btn" onclick={handleDateRangeSubmit} disabled={loading}>
					{loading ? 'Loading...' : 'Fetch Data'}
				</button>
			</div>

			{#if error}
				<div class="error-message">{error}</div>
			{/if}
		</div>

		{#if loading}
			<div class="loading-container">
				<Spinner />
				<p>Loading historical data...</p>
			</div>
		{:else if historicalData.length === 0}
			<p class="no-data">No historical data available for the selected date range.</p>
		{:else}
			<!-- Statistical Summary -->
			<div class="stats-section">
				<h3>Statistical Summary</h3>
				<div class="stats-grid">
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
						<StatsCard title="ppm" min={stats.co2.min} max={stats.co2.max} avg={stats.co2.avg} />
					{/if}

					{#if phChartVisible}
						<StatsCard title="pH" min={stats.ph.min} max={stats.ph.max} avg={stats.ph.avg} />
					{/if}
				</div>
			</div>

			<!-- Chart Visualizations -->
			<div class="charts-section">
				<h3>Data Visualization</h3>

				<!-- Full-width chart container for both temperature and humidity/moisture -->
				{#if temperatureChartVisible}
					<div class="chart-container full-width">
						<div class="chart temperature-chart">
							<h4>Sensor Data Over Time</h4>
							<div class="chart-placeholder">
								<div class="chart-visual">
									<div class="chart main-chart" bind:this={chart1}></div>
									<div class="chart brush-chart" bind:this={chart1Brush}></div>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Statistical individual charts - these remain in grid layout -->
				<div class="chart-container stats-charts">
					{#if humidityChartVisible || moistureChartVisible}
						<div class="chart humidity-moisture-chart">
							<h4>{dataType === 'air' ? 'Humidity' : 'Moisture'} Statistics</h4>
							<div class="chart-stats">
								<div class="chart-legend">
									{#if humidityChartVisible}
										<span class="min">Min: {stats.humidity.min}%</span>
										<span class="avg">Avg: {stats.humidity.avg}%</span>
										<span class="max">Max: {stats.humidity.max}%</span>
									{:else}
										<span class="min">Min: {stats.moisture.min}%</span>
										<span class="avg">Avg: {stats.moisture.avg}%</span>
										<span class="max">Max: {stats.moisture.max}%</span>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					<!-- Similar chart sections for CO2 and pH would go here -->
				</div>
			</div>

			<!-- Data Table -->
			<div class="data-table-section">
				<h3>Raw Data</h3>
				<div class="table-container">
					<div class="data-grid" bind:this={dataGrid}></div>
				</div>
			</div>
		{/if}
	</section>
</div>

<style>
	@import 'device-detail.css';
</style>
