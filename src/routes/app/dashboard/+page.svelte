<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import type { Location } from '$lib/models/Location';
	// Extended Location type to include cw_devices property
	interface LocationWithDevices extends Location {
		cw_devices?: DeviceWithSensorData[];
	}
	import type { DeviceWithType } from '$lib/models/Device';
	import type { AirData } from '$lib/models/AirData';
	import type { SoilData } from '$lib/models/SoilData';
	import Header from '$lib/components/Header.svelte';
	import Spinner from '$lib/components/Spinner.svelte';
	import DashboardCard from '$lib/components/UI/dashboard/DashboardCard.svelte';
	import DeviceDataList from '$lib/components/UI/dashboard/DeviceDataList.svelte';
	import DataRowItem from '$lib/components/UI/dashboard/DataRowItem.svelte';
	import DashboardFilterBits from '$lib/components/UI/dashboard/DashboardFilterBits.svelte';
	import LocationSidebar from '$lib/components/dashboard/LocationSidebar.svelte';

	import { DeviceTimerManager } from '$lib/utilities/deviceTimerManager';
	import { isSoilSensor, isDeviceActive, getDeviceActiveStatus, getLocationActiveStatus } from '$lib/utilities/dashboardHelpers';
	import { mdiViewDashboard, mdiMagnify, mdiClose } from '@mdi/js';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import { Icon } from 'svelte-ux';

	// Get user data from the server load function
	let { data } = $props();
	const user = data.user;

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

	// Reactive state variables
	let locations: LocationWithCount[] = $state([]);
	let devices: DeviceWithSensorData[] = $state([]);
	let selectedLocation: number | null = $state(null);
	let deviceActiveStatus: Record<string, boolean> = $state({});
	let loadingLocations = $state(true);
	let loadingDevices = $state(false);
	let locationError: string | null = $state(null);
	let deviceError: string | null = $state(null);
	let search = $state(browser ? (localStorage.getItem('dashboard_search') ?? '') : '');
	let hideEmptyLocations = $state(
		browser ? localStorage.getItem('hide_empty_locations') === 'true' : false
	);
	let dashboardViewType: 'grid' | 'mozaic' | 'list' = $state(
		browser
			? localStorage.getItem('dashboard_view_type') === 'mozaic'
				? 'mozaic'
				: localStorage.getItem('dashboard_view_type') === 'list'
					? 'list'
					: 'grid'
			: 'grid'
	);
	let dashboardSortType: 'alpha' | 'custom' = $state(
		browser
			? localStorage.getItem('dashboard_sort_type') === 'alpha'
				? 'alpha'
				: 'custom'
			: 'alpha'
	);

	// All polling and timer state is now managed by the DeviceTimerManager

	// Persist dashboard view type changes
	$effect(() => {
		if (browser) {
			localStorage.setItem('dashboard_view_type', dashboardViewType);
			localStorage.setItem('dashboard_search', search);
			localStorage.setItem('hide_empty_locations', hideEmptyLocations.toString());
		}
	});



	// Clean up timers and subscriptions when component is destroyed
	onDestroy(() => {
		console.log('Cleaning up dashboard resources');
		cleanupTimers();
	});

	// Load basic location data on mount
	onMount(async () => {
		try {
			// Fetch locations for the current user
			const response = await fetch(`/api/locations?userId=${user.id}`);
			if (!response.ok) throw new Error('Failed to fetch location data');

			const userLocations = await response.json();

			// Process locations and load devices for each location
			const locationPromises = userLocations.map(async (location) => {
				try {
					// Fetch devices for this location
					const devicesResponse = await fetch(`/api/locations/${location.location_id}/devices`);
					if (!devicesResponse.ok) return { ...location, deviceCount: 0, cw_devices: [] };

					const locationDevices = await devicesResponse.json();

					// Setup active timers for each device
					locationDevices.forEach((device: DeviceWithSensorData) => {
						if (device.latestData?.created_at) {
							setupDeviceActiveTimer(device);
						}
					});

					return {
						...location,
						deviceCount: locationDevices.length,
						cw_devices: locationDevices
					};
				} catch (error) {
					console.error(`Error loading devices for location ${location.location_id}:`, error);
					return { ...location, deviceCount: 0, cw_devices: [] };
				}
			});

			// Wait for all location device data to be loaded
			locations = await Promise.all(locationPromises);
			console.log('LOOC', locations);
			loadingLocations = false;

			// If there are locations, select the first one by default
			if (userLocations.length > 0) {
				await selectLocation(userLocations[0].location_id);
				
				// Set up polling for the selected location using the timer manager
				timerManager.setupPolling(userLocations[0].location_id, refreshDevicesForLocation);
			}
		} catch (err) {
			locationError = err instanceof Error ? err.message : 'Unknown error occurred';
			loadingLocations = false;
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

	// Function to update the location's devices and trigger a UI refresh
	function updateLocationDevices(locationId: number, updatedDevices: DeviceWithSensorData[]) {
		if (locations && locations.length > 0) {
			const currentLocationIndex = locations.findIndex((loc) => loc.location_id === locationId);
			if (currentLocationIndex >= 0) {
				locations[currentLocationIndex].cw_devices = [...updatedDevices];

				// Log the updated active status
				const status = getLocationActiveStatus(locations[currentLocationIndex], deviceActiveStatus);
				console.log('Location status updated after refresh:', {
					location: locations[currentLocationIndex].name,
					activeDevices: status.activeDevices.length,
					allActive: status.allActive,
					allInactive: status.allInactive
				});
			}
		}
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

			// Fetch devices for the selected location
			const response = await fetch(`/api/locations/${locationId}/devices`);
			if (!response.ok) throw new Error('Failed to fetch devices');

			const locationDevices = await response.json();

			// Update devices and setup active timers
			devices = locationDevices.map((device: DeviceWithSensorData) => {
				if (device.latestData?.created_at) {
					setupDeviceActiveTimer(device);
				}
				return device;
			});

			// Update the location's devices to trigger UI refresh
			updateLocationDevices(locationId, devices);

			// Update the refresh timestamp in the timer manager
			timerManager.updateRefreshTimestamp(locationId);

			console.log('Devices refreshed:', {
				deviceCount: devices.length,
				activeCount: devices.filter((d) => deviceActiveStatus[d.dev_eui as string]).length
			});

			return true;
		} catch (err) {
			console.error('Error refreshing devices:', err);
			return false;
		}
	}

	// Function to load devices for a specific location
	async function loadDevicesForLocation(locationId: number) {
		try {
			// Reset any previous device error
			deviceError = null;

			// Show loading indicator for devices
			loadingDevices = true;
			devices = [];

			// Clean up any existing timers
			cleanupTimers();

			// Fetch devices for the selected location
			const response = await fetch(`/api/locations/${locationId}/devices`);
			if (!response.ok) throw new Error('Failed to fetch devices');

			const locationDevices = await response.json();

			// Setup active timers for each device
			devices = locationDevices.map((device: DeviceWithSensorData) => {
				if (device.latestData?.created_at) {
					setupDeviceActiveTimer(device);
				}
				return device;
			});

			// Set up polling for updates using the timer manager
			timerManager.setupPolling(locationId, refreshDevicesForLocation);

			loadingDevices = false;
		} catch (err) {
			deviceError = err instanceof Error ? err.message : 'Unknown error occurred';
			loadingDevices = false;
		}
	}

	// Function to set up active timer for a device
	function setupDeviceActiveTimer(device: DeviceWithSensorData) {
		if (!device.latestData?.created_at) return;
		const deviceId = device.dev_eui as string;

		// Get the upload interval from the device
		const uploadInterval = device.upload_interval || device.deviceType?.default_upload_interval || 10;

		// Use the timer manager to set up a timer for this device
		timerManager.setupDeviceActiveTimer(
			device, 
			uploadInterval,
			(deviceId: string, isActive: boolean | null) => {
				// Update the device active status in our component state
				deviceActiveStatus[deviceId] = isActive === null ? false : isActive;
			}
		);
	}

	// Function to clean up a device timer
	function cleanupDeviceTimer(deviceId: string) {
		// Use the timer manager to clean up the timer for this device
		timerManager.cleanupDeviceTimer(deviceId);
	}

	// Function to select a location and load its devices
	async function selectLocation(locationId: number) {
		// If already selected with devices loaded, do nothing
		if (selectedLocation === locationId && devices.length > 0) return;

		// Clean up any existing polling before changing location
		timerManager.cleanupPolling();
		
		// Update selected location
		selectedLocation = locationId;
		
		// Load devices for the new location
		await loadDevicesForLocation(locationId);
		
		// Set up polling for the newly selected location
		timerManager.setupPolling(locationId, refreshDevicesForLocation);
	}

	// Function to get current selected location
	let currentLocation = $derived(locations.find((loc) => loc.location_id === selectedLocation));

	// Function to get container class based on view type
	function getContainerClass(viewType: string): string {
		switch (viewType) {
			case 'grid':
				return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
			case 'mozaic':
				return 'columns-[20rem] gap-4 space-y-4';
			case 'list':
				return 'flex flex-col gap-4';
			default:
				return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
		}
	}

	// Function to handle keyboard navigation for location selection
	// Note: handleKeyDown is now handled in the LocationSidebar component

	function clearSearch() {
		search = '';
		browser ? localStorage.removeItem('dashboard_search') : null;
	}
</script>

<svelte:head>
	<title>IoT Dashboard</title>
</svelte:head>

<div class="dashboard-container">
	{#if loadingLocations}
		<div class="loading">
			<Spinner />
			Loading Locations...
		</div>
	{:else if locationError}
		<div class="error">{locationError}</div>
	{:else}
		<div class="dashboard-grid">
			<!-- Location selector panel -->
			<LocationSidebar
				{locations}
				selectedLocation={selectedLocation}
				bind:search={search}
				bind:hideEmptyLocations={hideEmptyLocations}
				bind:dashboardViewType={dashboardViewType}
				bind:dashboardSortType={dashboardSortType}
				onSelectLocation={selectLocation}
			/>

			<!-- Device display panel -->
			<div class="devices-panel">
				<!-- All Locations as Cards with Devices -->
				{#if loadingLocations}
					<div class="loading-devices">Loading locations and devices...</div>
				{:else if locationError}
					<div class="error">{locationError}</div>
				{:else if locations.length > 0}
					<div
						class="device-cards-grid grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
					>
						{#each locations as location (location.location_id)}
							{@const activeDevices = (location.cw_devices ?? []).filter((d) => isDeviceActive(d, deviceActiveStatus))}
							{@const allActive =
								(location.cw_devices?.length ?? 0) > 0 &&
								activeDevices.length === (location.cw_devices?.length ?? 0)}
							{@const allInactive =
								(location.cw_devices?.length ?? 0) > 0 && activeDevices.length === 0}
							<DashboardCard
								{location}
								href={`/app/dashboard/location/${location.location_id}`}
								{activeDevices}
								{allActive}
								{allInactive}
							>
								{#snippet content()}
									{#each location.cw_devices ?? [] as device (device.dev_eui)}
										{@const isActive = isDeviceActive(device, deviceActiveStatus)}
										<DataRowItem
											device={{
												...device,
												latestData: device.latestData || {},
												cw_device_type: {
													name: device.deviceType?.name || 'Unknown',
													default_upload_interval: device.deviceType?.default_upload_interval || 10,
													primary_data_notation: device.deviceType?.primary_data_notation || '°C',
													secondary_data_notation:
														device.deviceType?.secondary_data_notation || '%',
													primary_data_v2: device.deviceType?.primary_data_v2 || null,
													secondary_data_v2: device.deviceType?.secondary_data_v2 || null,
												}
											}}
											{isActive}
											detailHref={`/dashboard/location/${device.location_id}/device/${device.dev_eui}`}
										>
										{#snippet children()}
										<DeviceDataList
													device={{
														...device,
														latestData: device.latestData || {},
														cw_device_type: {
															name: device.deviceType?.name || 'Unknown',
															default_upload_interval:
																device.deviceType?.default_upload_interval || 10,
															primary_data_notation:
																device.deviceType?.primary_data_notation,
															secondary_data_notation:
																device.deviceType?.secondary_data_notation || null,
															primary_data_v2: device.deviceType?.primary_data_v2 || null,
															secondary_data_v2: device.deviceType?.secondary_data_v2 || null,
														}
													}}
													{isActive}
												/>
											{/snippet}
										</DataRowItem>
									{/each}
								{/snippet}
							</DashboardCard>
						{/each}
					</div>
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



	.device-cards-grid {
		/* Base styles that apply to all view modes */
		gap: 1rem;
		width: 100%;
		max-width: 1200px;
		margin: 0; /* Remove auto margin to align left */
	}

	/* When in grid mode, the container class will handle the grid layout */
	.device-cards-grid.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	}

	/* Grid view responsive columns */
	@media (min-width: 640px) {
		.device-cards-grid.grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	@media (min-width: 1024px) {
		.device-cards-grid.grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	@media (min-width: 1280px) {
		.device-cards-grid.grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}

	/* Card styling for dashboard components */
	:global(.dashboard-card) {
		margin-bottom: 1rem;
		width: 100%;
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
