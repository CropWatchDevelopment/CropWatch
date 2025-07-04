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
	// Define the interface for LocationSidebar props to match the component's exported props
	interface LocationSidebarProps {
		locations: LocationWithCount[];
		selectedLocation: number | null;
		search: string;
		hideEmptyLocations: boolean;
		dashboardViewType: string;
		dashboardSortType: string;
		collapsed: boolean;
		onSelectLocation: (locationId: number) => void;
		onToggleCollapse: () => void;
	}
	import AllDevices from '$lib/components/UI/dashboard/AllDevices.svelte';
	import { updated } from '$app/state';
	import { date } from 'svelte-i18n';

	// Enhanced location type with deviceCount property
	interface LocationWithCount extends LocationWithDevices {
		deviceCount: number;
	}

	// Enhanced device type with latest sensor data
	interface DeviceWithSensorData extends DeviceWithType {
		latestData: AirData | SoilData | null;
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
			locationsStore.locations.forEach((location) => {
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

	// Sidebar collapsed state
	let sidebarCollapsed = $state(false);

	// Real-time channel for database updates
	let realtimeChannel: any = null;

	// Setup real-time subscriptions with retry logic
	function setupRealtimeSubscription(retryCount = 0) {
		if (!browser) return;

		console.log('🔄 Setting up real-time subscription...');
		const channel = data.supabase
			.channel('db-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cw_air_data'
				},
				(payload) => {
					console.log('Real-time message payload:', payload);
					// Handle real-time updates for messages
					if (payload.eventType === 'INSERT') {
						handleRealtimeUpdate(payload);
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: 'INSERT',
					schema: 'public',
					table: 'cw_soil_data'
				},
				(payload) => {
					console.log('Real-time user payload:', payload);
					// Handle real-time updates for users
					if (payload.eventType === 'INSERT') {
						// You can handle user updates here if needed
						console.log('New user added:', payload.new);
					}
				}
			)
			.subscribe();
	}

	// Handle real-time update
	function handleRealtimeUpdate(payload: any) {
		// Only process if we have valid data
		if (payload.new && payload.new.dev_eui) {
			try {
				locationsStore.updateSingleDevice(payload.new.dev_eui, payload.new as AirData | SoilData);

				// Update device active timer for the updated device
				const device = locationsStore.devices.find((d) => d.dev_eui === payload.new.dev_eui);
				if (device && device.latestData?.created_at) {
					setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
				}
			} catch (error) {
				console.error('Error updating device from real-time:', error);
			}
		}
	}

	// Alternative real-time setup with simplified approach
	function setupFallbackRealtimeSubscription() {
		if (!browser) return;

		console.log('🔄 Setting up fallback real-time subscription...');

		try {
			// Clean up existing channel
			if (realtimeChannel) {
				data.supabase.removeChannel(realtimeChannel);
				realtimeChannel = null;
			}

			// Create a simpler channel setup
			const channelName = `fallback_${Date.now()}`;
			console.log('Creating fallback channel:', channelName);

			realtimeChannel = data.supabase
				.channel(channelName)
				.on(
					'postgres_changes',
					{
						event: 'INSERT',
						schema: 'public',
						table: 'cw_air_data'
					},
					handleRealtimeUpdate
				)
				.subscribe((status: string) => {
					console.log('Fallback real-time status:', status);
					if (status === 'SUBSCRIBED') {
						console.log('✅ Fallback real-time subscription successful');
					} else if (status === 'CHANNEL_ERROR') {
						console.error('❌ Fallback real-time also failed');
						// If fallback also fails, disable real-time and rely on polling
						console.log('📊 Falling back to polling-only mode');
						cleanupRealtimeSubscription();
					}
				});
		} catch (error) {
			console.error('Error setting up fallback real-time:', error);
		}
	}
	function cleanupRealtimeSubscription() {
		if (realtimeChannel) {
			data.supabase.removeChannel(realtimeChannel);
			realtimeChannel = null;
		}
	}

	// Toggle sidebar collapsed state
	function toggleSidebar() {
		sidebarCollapsed = !sidebarCollapsed;
		if (browser) {
			localStorage.setItem('sidebar_collapsed', sidebarCollapsed.toString());
		}
	}

	// Load sidebar state from localStorage on mount
	// Note: This is separate from the main onMount function to avoid conflicts
	onMount(() => {
		if (browser) {
			const savedState = localStorage.getItem('sidebar_collapsed');
			if (savedState !== null) {
				sidebarCollapsed = savedState === 'true';
			}
		}
	});

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
		//console.log('Cleaning up dashboard resources');
		cleanupTimers();
		cleanupRealtimeSubscription();
	});

	// Refresh session if needed
	async function refreshSessionIfNeeded() {
		try {
			const { data: sessionData, error: sessionError } = await data.supabase.auth.getSession();

			if (sessionError) {
				console.error('❌ Error getting session:', sessionError);
				return false;
			}

			if (!sessionData.session) {
				console.error('❌ No session found');
				return false;
			}

			const expiresAt = sessionData.session.expires_at;
			if (expiresAt) {
				const expirationDate = new Date(expiresAt * 1000);
				const now = new Date();
				const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

				// If expired or expiring soon, refresh
				if (expirationDate < fiveMinutesFromNow) {
					console.log('🔄 Session expiring soon, refreshing...');
					const { data: refreshData, error: refreshError } =
						await data.supabase.auth.refreshSession();

					if (refreshError) {
						console.error('❌ Failed to refresh session:', refreshError);
						return false;
					}

					console.log('✅ Session refreshed successfully');
					return true;
				}
			}

			return true;
		} catch (error) {
			console.error('❌ Error refreshing session:', error);
			return false;
		}
	}

	// Initialize dashboard on mount
	// This is the main onMount function for the dashboard
	onMount(async () => {
		try {
			// Setup real-time subscription
			setupRealtimeSubscription();

			// Fetch locations using the store - this also selects the first location
			await locationsStore.fetchLocations(user.id);

			// Setup active timers for all devices in all locations
			locationsStore.locations.forEach((location) => {
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
				timerManager.setupPolling(locationsStore.selectedLocationId, refreshDevicesForLocation);
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
				//console.log(
				//	`Skipping refresh for location ${locationId}, last refresh was ${timeSinceLastRefresh / 1000}s ago`
				//);
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
					locationId,
					deviceCount: locationsStore.devices.length,
					activeCount: locationsStore.devices.filter(
						(d: DeviceWithSensorData) => deviceActiveStatus[d.dev_eui as string]
					).length
				});
			}

			return true;
		} catch (err) {
			console.error('Error refreshing devices:', err);
			return false;
		}
	}

	// Function to select a location and load its devices
	async function selectLocation(locationId: number | null) {
		//console.log('Dashboard selectLocation called with:', locationId);
		//console.log('Current selectedLocationId:', locationsStore.selectedLocationId);

		// If already selected, do nothing
		if (locationsStore.selectedLocationId === locationId) {
			//console.log('Location already selected, returning');
			return;
		}

		// Clean up any existing polling before changing location
		timerManager.cleanupPolling();

		// Use the store to select location and load devices
		//console.log('Calling store.selectLocation with:', locationId);
		await locationsStore.selectLocation(locationId);
		//console.log(
		// 	'After store.selectLocation, selectedLocationId is:',
		// 	locationsStore.selectedLocationId
		// );

		// Setup active timers for each device
		locationsStore.devices.forEach((device: DeviceWithSensorData) => {
			if (device.latestData?.created_at) {
				setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
			}
		});

		// Set up polling only for specific locations, not for "All Locations"
		if (locationId !== null) {
			timerManager.setupPolling(locationId, refreshDevicesForLocation);
		}
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
		<!-- <div class="dashboard-grid" class:sidebar-collapsed={sidebarCollapsed}> -->
		<!-- <LocationSidebar
				locations={locationsStore.locations}
				selectedLocation={locationsStore.selectedLocationId}
				search={uiStore.search}
				hideEmptyLocations={uiStore.hideEmptyLocations}
				dashboardViewType={uiStore.dashboardViewType}
				dashboardSortType={uiStore.dashboardSortType}
				{deviceActiveStatus}
				onSelectLocation={selectLocation}
				collapsed={sidebarCollapsed}
				onToggleCollapse={toggleSidebar}
				onsearch={(value) => {
					//console.log('Dashboard: onsearch called with:', value);
					uiStore.search = value;
					//console.log('Dashboard: uiStore.search set to:', uiStore.search);
				}}
				onhideEmptyLocationsChange={(value) => (uiStore.hideEmptyLocations = value)}
				ondashboardViewTypeChange={(value) =>
					(uiStore.dashboardViewType = value as 'grid' | 'mozaic' | 'list')}
				ondashboardSortTypeChange={(value) =>
					(uiStore.dashboardSortType = value as 'alpha' | 'custom')}
			/> -->

		<div class="devices-panel">
			<!-- All Locations as Cards with Devices -->
			{#if locationsStore.loadingLocations}
				<div class="loading-devices">Loading locations and devices...</div>
			{:else if locationsStore.locationError}
				<div class="error">{locationsStore.locationError}</div>
			{:else if locationsStore.locations.length > 0}
				{#if locationsStore.selectedLocationId !== null}
					<!-- Show only the selected location -->
					{@const selectedLoc = locationsStore.locations.find(
						(loc) => loc.location_id === locationsStore.selectedLocationId
					)}
					{#if selectedLoc}
						<AllDevices locations={[selectedLoc]} {deviceActiveStatus} />
					{:else}
						<div class="error">Selected location not found.</div>
					{/if}
				{:else}
					<!-- Show all locations ("All Locations" is selected) -->
					<AllDevices locations={locationsStore.locations} {deviceActiveStatus} />
				{/if}
			{:else}
				<p>No locations found.</p>
			{/if}
		</div>
		<!-- </div> -->
	{/if}
</div>

<style>
	/* .dashboard-container {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background-color: var(--color-bg);
		color: var(--color-text);
		--sidebar-expanded: 250px;
		--sidebar-collapsed: 40px;
	} */

	/* .dashboard-grid {
		display: grid;
		grid-template-columns: var(--sidebar-expanded) 1fr;
		gap: 0.25rem;
		padding: 0.5rem;
		flex: 1;
		transition: grid-template-columns 0.3s ease;
	} */

	/* .dashboard-grid.sidebar-collapsed {
		grid-template-columns: var(--sidebar-collapsed) 1fr;
	} */

	/* Ensure the devices panel grows when sidebar collapses */
	.devices-panel {
		/* background-color: var(--color-bg); */
		transition: all 0.3s ease;
		width: 100%;
		overflow: auto;
		/* background-color: var(--color-card); */
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}

	/* @media (max-width: 768px) {
		.dashboard-grid {
			grid-template-columns: 1fr;
		}
	} */

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
