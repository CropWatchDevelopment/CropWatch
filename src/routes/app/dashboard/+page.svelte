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

	import { createActiveTimer } from '$lib/utilities/ActiveTimer';
	import { mdiViewDashboard } from '@mdi/js';
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

	// State variables
	let locations: LocationWithCount[] = $state([]);
	let selectedLocation: number | null = $state(null);
	let devices: DeviceWithSensorData[] = $state([]);
	let deviceActiveStatus: Record<string, boolean> = $state({});
	let pollingIntervalId: number | null = $state(null);
	let lastRefreshTimestamp: Record<number, number> = $state({}); // Cache timestamp by location ID

	// Store unsubscribe functions for cleanup
	const unsubscribers: (() => void)[] = [];

	// Polling interval ID

	// View state variables
	let search: string = $state(browser ? (localStorage.getItem('dashboard_search') ?? '') : '');
	let hideEmptyLocations: boolean = $state(
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

	// Loading states
	let loadingLocations = $state(true);
	let loadingDevices = $state(false);
	let locationError: string | null = $state(null);
	let deviceError: string | null = $state(null);

	// Persist dashboard view type changes
	$effect(() => {
		if (browser) {
			localStorage.setItem('dashboard_view_type', dashboardViewType);
			localStorage.setItem('dashboard_search', search);
			localStorage.setItem('hide_empty_locations', hideEmptyLocations.toString());
		}
	});

	// Function to get device active status
	function getDeviceActiveStatus(devEui: string | null): boolean {
		if (
			!devEui ||
			deviceActiveStatus[devEui] === null ||
			deviceActiveStatus[devEui] === undefined
		) {
			return false;
		}
		return Boolean(deviceActiveStatus[devEui]);
	}

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
			if (locations.length > 0) {
				selectedLocation = locations[0].location_id;
				// Devices are already loaded for each location
				devices = locations[0].cw_devices || [];
			}
		} catch (err) {
			locationError = err instanceof Error ? err.message : 'Unknown error occurred';
			loadingLocations = false;
		}
	});

	// Set up polling for device data updates
	function setupPolling() {
		console.log('setupPolling called');
		// Clear any existing polling interval
		if (pollingIntervalId !== null) {
			clearInterval(pollingIntervalId);
			pollingIntervalId = null;
		}

		// Set up new polling interval (every 2 minutes)
		const intervalId = setInterval(async () => {
			console.log(`[Polling] Device data polling triggered at ${new Date().toLocaleString()}`);
			if (selectedLocation) {
				await refreshDevicesForLocation(selectedLocation);
			}
		}, 120000); // 2 minutes

		// Store the interval ID for cleanup
		pollingIntervalId = intervalId as unknown as number;
	}

	// Function to clean up all timers and polling
	function cleanupTimers() {
		// Clear polling interval
		if (pollingIntervalId !== null) {
			clearInterval(pollingIntervalId);
			pollingIntervalId = null;
		}

		// Clear all active timers
		unsubscribers.forEach((unsub) => unsub());
		unsubscribers.length = 0;
	}

	// Function to update the location's devices and trigger a UI refresh
	function updateLocationDevices(locationId: number, updatedDevices: DeviceWithSensorData[]) {
		if (locations && locations.length > 0) {
			const currentLocationIndex = locations.findIndex((loc) => loc.location_id === locationId);
			if (currentLocationIndex >= 0) {
				locations[currentLocationIndex].cw_devices = [...updatedDevices];

				// Log the updated active status
				const status = getLocationActiveStatus(locations[currentLocationIndex]);
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
			// Check if we need to refresh based on cache
			const now = Date.now();
			const lastRefresh = lastRefreshTimestamp[locationId] || 0;
			const timeSinceLastRefresh = now - lastRefresh;

			// Only refresh if it's been at least 30 seconds since the last refresh
			// This prevents excessive DB calls while still allowing the active timer to work
			if (timeSinceLastRefresh < 30000) {
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

			// Update the refresh timestamp
			lastRefreshTimestamp[locationId] = now;

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

			// Set up polling for updates
			setupPolling();

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

		// Clear any existing timer for this device
		cleanupDeviceTimer(deviceId);

		const uploadInterval =
			device.upload_interval || device.deviceType?.default_upload_interval || 10;

		// Create a closure to capture the current timestamp
		const currentTimestamp = device.latestData.created_at;

		const activeTimer = createActiveTimer(new Date(currentTimestamp), Number(uploadInterval));

		// Update device active status when timer changes
		const unsubscribe = activeTimer.subscribe((isActive) => {
			// Only update if this is still the current device data
			// This prevents old timers from incorrectly marking devices as inactive
			if (device.latestData?.created_at === currentTimestamp) {
				console.log(`Device ${device.name} (${deviceId}) status updated:`, {
					isActive,
					lastUpdate: currentTimestamp,
					uploadInterval
				});
				deviceActiveStatus[deviceId] = isActive;
			} else {
				console.log(`Ignoring outdated timer update for ${device.name} (${deviceId})`, {
					timerTimestamp: currentTimestamp,
					currentTimestamp: device.latestData?.created_at
				});
			}
		});

		// Store the unsubscribe function for cleanup and track its index
		const timerIndex = unsubscribers.length;
		unsubscribers.push(unsubscribe);
		deviceTimers[deviceId] = timerIndex;
	}

	// Map to track device timers by device ID
	let deviceTimers: Record<string, number> = $state({});

	// Function to clean up a device timer
	function cleanupDeviceTimer(deviceId: string) {
		// Find the index of the timer for this device
		const timerIndex = deviceTimers[deviceId];

		// If we have a timer index for this device
		if (timerIndex !== undefined && timerIndex >= 0 && timerIndex < unsubscribers.length) {
			// Call the unsubscribe function
			unsubscribers[timerIndex]();

			// Remove the unsubscribe function from the array (replace with a no-op)
			unsubscribers[timerIndex] = () => {};

			// Remove the device from the timers map
			delete deviceTimers[deviceId];
		}
	}

	// Function to select a location and load its devices
	async function selectLocation(locationId: number) {
		if (selectedLocation === locationId && devices.length > 0) return;

		selectedLocation = locationId;
		await loadDevicesForLocation(locationId);
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
	function handleKeyDown(e: KeyboardEvent, location: Location) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleLocationClick(location);
		}
	}

	// Function to check if a device is active
	function isDeviceActive(device: DeviceWithSensorData): boolean {
		if (!device) return false;

		// Get the device ID
		const devEui = device.dev_eui as string;

		// Special handling for devices with negative upload intervals (always active)
		const uploadInterval =
			device.upload_interval || device.deviceType?.default_upload_interval || 10;
		if (uploadInterval <= 0) {
			return true;
		}

		// Special handling for soil sensors
		if (isSoilSensor(device)) {
			if (device.deviceType?.isActive !== undefined) {
				return Boolean(device.deviceType.isActive);
			}

			// If the soil sensor has moisture data, consider it active
			if (device.latestData && 'moisture' in device.latestData) {
				return true;
			}
		}

		return getDeviceActiveStatus(devEui);
	}

	// Helper function to determine if a device is a soil sensor
	function isSoilSensor(device: DeviceWithSensorData): boolean {
		// Check device name for soil-related terms
		const deviceName = device.name?.toLowerCase() || '';
		const deviceTypeName = device.deviceType?.name?.toLowerCase() || '';

		// Check device type (type 17 is soil sensor in your system)
		if (device.type === 17) {
			return true;
		}

		// Check if the device name or type contains soil-related terms
		return (
			deviceName.includes('soil') ||
			deviceName.includes('moisture') ||
			deviceTypeName.includes('soil') ||
			deviceTypeName.includes('moisture') ||
			// Check if the device has soil-specific data points
			(device.latestData && 'moisture' in device.latestData)
		);
	}

	// Helper function to get active status indicators for a location
	function getLocationActiveStatus(location: LocationWithCount) {
		if (!location || !location.cw_devices || location.cw_devices.length === 0) {
			return { activeDevices: [], allActive: false, allInactive: false };
		}

		const locationDevices = location.cw_devices;
		// Use isDeviceActive instead of getDeviceActiveStatus for consistency
		const activeDevices = locationDevices.filter((device) => isDeviceActive(device));
		const allActive =
			locationDevices.length > 0 && locationDevices.every((device) => isDeviceActive(device));
		const allInactive =
			locationDevices.length > 0 && locationDevices.every((device) => !isDeviceActive(device));

		return { activeDevices, allActive, allInactive };
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
			<div class="locations-panel w-[300px]">
				<h2 class="flex items-center">
					<Icon path={mdiViewDashboard} class="mr-2" />
					Locations
					<div class="ml-auto">
						<DashboardFilterBits
							bind:search
							bind:hideNoDeviceLocations={hideEmptyLocations}
							bind:dashboardViewType
							bind:dashboardSortType
						/>
					</div>
				</h2>
				{#if locations.length === 0}
					<p>No locations found.</p>
				{:else}
					<ul class="location-list" role="listbox" aria-label="Select a location">
						{#each locations
							.filter((location) => {
								if (hideEmptyLocations) return location.deviceCount > 0;
								return true;
							})
							.filter((location) => {
								if (!search?.trim()) return true;
								return location.name.toLowerCase().includes(search.toLowerCase());
							}) as location (location.location_id)}
							<li>
								<button
									class="location-item"
									class:selected={selectedLocation === location.location_id}
									onclick={() => selectLocation(location.location_id)}
									onkeydown={(e) => handleKeyDown(e, location)}
									role="option"
									aria-selected={selectedLocation === location.location_id}
								>
									<p class="location-name">{location.name}</p>
									{#if location.description}
										<p class="location-description">{location.description}</p>
									{/if}
									<p class="location-device-count">{location.deviceCount} devices</p>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Device display panel -->
			<div class="devices-panel">
				{#if selectedLocation !== null && currentLocation}
					<h2>Devices at {currentLocation.name}</h2>

					{#if loadingDevices}
						<div class="loading-devices">Loading devices...</div>
					{:else if deviceError}
						<div class="error">{deviceError}</div>
					{:else if devices.length > 0}
						<div class={`device-cards-grid ${getContainerClass(dashboardViewType)}`}>
							{#if true}
								{@const activeDevices = devices.filter((d) => isDeviceActive(d))}
								{@const allActive = devices.length > 0 && activeDevices.length === devices.length}
								{@const allInactive = devices.length > 0 && activeDevices.length === 0}
								{@const debugInfo = console.log('Dashboard active status:', {
									locationName: currentLocation?.name,
									deviceCount: devices.length,
									activeCount: activeDevices.length,
									allActive,
									allInactive,
									activeDevices: activeDevices.map((d) => d.dev_eui)
								})}
								<div class="device-card-wrapper">
									<DashboardCard
										location={{
											name: currentLocation?.name || 'Unknown Location',
											location_id: currentLocation?.location_id || 0,
											created_at: currentLocation?.created_at || new Date().toISOString(),
											description: currentLocation?.description || ''
										} as Location}
										href={`/app/dashboard/location/${currentLocation?.location_id}`}
										{activeDevices}
										{allActive}
										{allInactive}
									>
										{#snippet content()}
											{#each devices as device (device.dev_eui)}
												{@const isActive = isDeviceActive(device)}
												{@const debugActiveStatus = console.log(
													`Dashboard passing isActive=${isActive} to DataRowItem for ${device.name} (${device.dev_eui})`,
													{
														deviceId: device.dev_eui,
														deviceType: device.type,
														uploadInterval: device.upload_interval,
														isSoilSensor: isSoilSensor(device),
														hasNegativeInterval: (device.upload_interval || 10) <= 0
													}
												)}
												<DataRowItem
													device={{
														...device,
														latestData: device.latestData || {},
														cw_device_type: {
															name: device.deviceType?.name || 'Unknown',
															default_upload_interval:
																device.deviceType?.default_upload_interval || 10,
															primary_data_notation:
																device.deviceType?.primary_data_notation || '°C',
															secondary_data_notation:
																device.deviceType?.secondary_data_notation || '%',
															primary_data_v2: 'temperature_c',
															secondary_data_v2: isSoilSensor(device) ? 'moisture' : 'humidity'
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
																		device.deviceType?.primary_data_notation || '°C',
																	secondary_data_notation:
																		device.deviceType?.secondary_data_notation || '%',
																	primary_data_v2: 'temperature_c',
																	secondary_data_v2: isSoilSensor(device) ? 'moisture' : 'humidity'
																}
															}}
															{isActive}
														/>
													{/snippet}
												</DataRowItem>
											{/each}
										{/snippet}
									</DashboardCard>
								</div>
							{/if}
						</div>
					{:else}
						<p>No devices found for this location.</p>
					{/if}
				{:else}
					<p>Select a location to view its devices</p>
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

	.locations-panel,
	.devices-panel {
		background-color: var(--color-card);
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	.locations-panel h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1rem;
		display: flex;
		align-items: center;
	}

	.location-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.location-item {
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border-radius: 0.375rem;
		background-color: var(--color-card-hover);
		width: 100%;
		text-align: left;
		transition: background-color 0.2s;
		border: none;
		cursor: pointer;
	}

	.location-item:hover {
		background-color: var(--color-card-active);
	}

	.location-item.selected {
		background-color: var(--color-primary);
		color: white;
	}

	.location-name {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.location-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.location-device-count {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.devices-panel h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1rem;
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

	/* When in mozaic mode, use columns layout */
	.device-cards-grid.columns-\[20rem\] {
		column-count: 1;
	}

	@media (min-width: 640px) {
		.device-cards-grid.columns-\[20rem\] {
			column-count: 2;
		}
	}

	@media (min-width: 1024px) {
		.device-cards-grid.columns-\[20rem\] {
			column-count: 3;
		}
	}

	@media (min-width: 1280px) {
		.device-cards-grid.columns-\[20rem\] {
			column-count: 4;
		}
	}

	.device-card-wrapper {
		margin-bottom: 1rem;
		width: 100%;
		max-width: 320px;
	}

	/* In list view, make cards take full width */
	.device-cards-grid.flex .device-card-wrapper {
		max-width: 100%;
		width: 100%;
	}

	/* Make sure the DashboardCard component takes full width in list view */
	.device-cards-grid.flex .device-card-wrapper :global(.dashboard-card) {
		width: 100%;
	}

	/* In mozaic view, ensure cards break properly */
	.device-cards-grid.columns-\[20rem\] .device-card-wrapper {
		display: inline-block;
		width: 100%;
		break-inside: avoid;
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
