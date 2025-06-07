<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { getLocationsStore } from '$lib/stores/LocationsStore.svelte';
	import { getDashboardUIStore } from '$lib/stores/DashboardUIStore.svelte';
	import { DeviceTimerManager } from '$lib/utilities/deviceTimerManager';
	import { setupDeviceActiveTimer } from '$lib/utilities/deviceTimerSetup';
	
	// Get user data from the server load function
	let { data } = $props();
	const user = data.user;
	// Extended Location type to include cw_devices property
	interface LocationWithDevices extends Location {
		cw_devices?: DeviceWithSensorData[];
	}
	import type { DeviceWithType } from '$lib/models/Device';
	import type { AirData } from '$lib/models/AirData';
	import type { SoilData } from '$lib/models/SoilData';
	import Spinner from '$lib/components/Spinner.svelte';
	import LocationSidebar from '$lib/components/dashboard/LocationSidebar.svelte';
	import AllDevices from '$lib/components/UI/dashboard/AllDevices.svelte';

	// Enhanced location type with deviceCount property
	interface LocationWithCount extends LocationWithDevices {
		deviceCount: number;
	}

	// Enhanced device type with latest sensor data
	interface DeviceWithSensorData extends DeviceWithType {
		latestData: AirData | SoilData | null;
		cw_device_type?: {
			name: string;
			default_upload_interval?: number;
			primary_data_notation?: string;
			secondary_data_notation?: string;
		};
		cw_rules?: any[];
	}

	// Create a timer manager instance
	const timerManager = new DeviceTimerManager();
	
	// Initialize stores and managers
	// Use writable store for device active status - initialize as null (unknown) for all devices
	const deviceActiveStatus = $state<Record<string, boolean | null>>({});
	// Initialize the locations store
	const locationsStore = getLocationsStore();
	
	// Pre-initialize all devices as null (unknown status) to prevent flash of green
	$effect(() => {
		if (locationsStore.locations.length > 0) {
			locationsStore.locations.forEach(location => {
				if (location.cw_devices && location.cw_devices.length > 0) {
					location.cw_devices.forEach((device: DeviceWithSensorData) => {
						if (device.dev_eui && !(device.dev_eui in deviceActiveStatus)) {
							deviceActiveStatus[device.dev_eui] = null;
						}
					});
				}
			});
		}
	});
	
	// Initialize the dashboard UI store for preferences
	const uiStore = getDashboardUIStore();
	
	// Persist UI store values to localStorage when they change
	$effect(() => {
		if (browser) {
			localStorage.setItem('dashboard_view_type', uiStore.dashboardViewType);
			localStorage.setItem('dashboard_search', uiStore.search);
			localStorage.setItem('hide_empty_locations', uiStore.hideEmptyLocations.toString());
			localStorage.setItem('dashboard_sort_type', uiStore.dashboardSortType);
		}
	});

	// All polling and timer state is now managed by the DeviceTimerManager

	// Clean up timers and subscriptions when component is destroyed
	onDestroy(() => {
		console.log('Cleaning up dashboard resources');
		cleanupTimers();
	});

	// Initialize dashboard on mount
	onMount(async () => {
		try {
			// Fetch locations using the store - this also selects the first location
			await locationsStore.fetchLocations(user.id);
			
			// Setup active timers for all devices in all locations
			locationsStore.locations.forEach(location => {
				if (location.cw_devices && location.cw_devices.length > 0) {
					location.cw_devices.forEach((device: DeviceWithSensorData) => {
						if (device.latestData?.created_at) {
							setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
						}
					});
				}
			});
			
			// Set up polling for the selected location
			if (locationsStore.selectedLocationId) {
				timerManager.setupPolling(
					locationsStore.selectedLocationId, 
					refreshDevicesForLocation
				);
			}
		} catch (err) {
			console.error('Error initializing dashboard:', err);
		}
	});

	// Note: Polling is now handled directly by the DeviceTimerManager
	// in the selectLocation function and onMount lifecycle hook

	// Function to clean up all timers and polling
	function cleanupTimers() {
		// Clean up polling interval using the timer manager
		timerManager.cleanupPolling();
		// Clean up all active timers using the timer manager
		timerManager.cleanupTimers();
	}

	// Function to refresh devices for a location without changing the selected location
	async function refreshDevicesForLocation(locationId: number) {
		try {
			// Check if we need to refresh based on cache using the timer manager
			if (!timerManager.needsRefresh(locationId)) {
				const lastRefresh = timerManager.getLastRefreshTimestamp(locationId);
				const timeSinceLastRefresh = Date.now() - lastRefresh;
				console.log(
					`Skipping refresh for location ${locationId}, last refresh was ${timeSinceLastRefresh / 1000}s ago`
				);
				return true;
			}

			// Use the store to refresh devices
			await locationsStore.refreshDevicesForLocation(locationId);
			
			// Setup active timers for each device
			if (locationsStore.devices && Array.isArray(locationsStore.devices)) {
				locationsStore.devices.forEach((device: DeviceWithSensorData) => {
					if (device.latestData?.created_at) {
						setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
					}
				});

				// Update the refresh timestamp in the timer manager
				timerManager.updateRefreshTimestamp(locationId);

				console.log('Devices refreshed:', {
					deviceCount: locationsStore.devices.length,
					activeCount: locationsStore.devices.filter((d: DeviceWithSensorData) => 
						deviceActiveStatus[d.dev_eui as string]).length
				});
			}

			return true;
		} catch (err) {
			console.error('Error refreshing devices:', err);
			return false;
		}
	}



	// Function to select a location and load its devices
	async function selectLocation(locationId: number) {
		// If already selected, do nothing
		if (locationsStore.selectedLocationId === locationId) return;

		// Clean up any existing polling before changing location
		timerManager.cleanupPolling();

		// Use the store to select location and load devices
		await locationsStore.selectLocation(locationId);

		// Setup active timers for each device
		locationsStore.devices.forEach((device: DeviceWithSensorData) => {
			if (device.latestData?.created_at) {
				setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
			}
		});

		// Set up polling for the newly selected location
		timerManager.setupPolling(locationId, refreshDevicesForLocation);
	}

	// Note: handleKeyDown is now handled in the LocationSidebar component
</script>

<svelte:head>
	<title>IoT Dashboard</title>
</svelte:head>

<div class="dashboard-container">
	{#if locationsStore.loadingLocations}
		<div class="loading">
			<Spinner />
			Loading Locations...
		</div>
	{:else if locationsStore.locationError}
		<div class="error">{locationsStore.locationError}</div>
	{:else}
		<div class="dashboard-grid">
			<!-- Location selector panel -->
			<LocationSidebar
				locations={locationsStore.locations}
				selectedLocation={locationsStore.selectedLocationId}
				bind:search={uiStore.search}
				bind:hideEmptyLocations={uiStore.hideEmptyLocations}
				bind:dashboardViewType={uiStore.dashboardViewType}
				bind:dashboardSortType={uiStore.dashboardSortType}
				onSelectLocation={selectLocation}
			/>

			<!-- Device display panel -->
			<div class="devices-panel">
				<!-- All Locations as Cards with Devices -->
				{#if locationsStore.loadingLocations}
					<div class="loading-devices">Loading locations and devices...</div>
				{:else if locationsStore.locationError}
					<div class="error">{locationsStore.locationError}</div>
				{:else if locationsStore.locations.length > 0}
					<AllDevices 
						locations={locationsStore.locations} 
						{deviceActiveStatus} 
					/>
				{:else}
					<p>No locations found.</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.dashboard-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--color-bg);
		color: var(--color-text);
	}

	.dashboard-grid {
		display: grid;
		grid-template-columns: 300px 1fr;
		gap: 1.5rem;
		padding: 1.5rem;
		flex: 1;
	}

	@media (max-width: 768px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	}

	.devices-panel {
		background-color: var(--color-card);
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.loading,
	.loading-devices,
	.error {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		font-size: 1rem;
		color: var(--color-text-secondary);
	}

	.error {
		color: var(--color-danger);
	}
</style>
