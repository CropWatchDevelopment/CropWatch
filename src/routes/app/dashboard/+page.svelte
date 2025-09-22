<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { getLocationsStore } from '$lib/stores/LocationsStore.svelte';
	import { getDashboardUIStore } from '$lib/stores/DashboardUIStore.svelte';
	import { DeviceTimerManager } from '$lib/utilities/deviceTimerManager';
	import { setupDeviceActiveTimer } from '$lib/utilities/deviceTimerSetup';
	import { applyStoredDeviceOrder } from '$lib/utilities/deviceOrderStorage';

	// Get user data from the server load function
	let { data } = $props();
	const user = data.user;
	let isTabVisible = $state(true);
	let lastRefresh = $state(new Date());

	// Extended Location type to include cw_devices property
	interface LocationWithDevices extends Location {
		cw_devices?: DeviceWithSensorData[];
	}
	import type { DeviceWithType } from '$lib/models/Device';
	import Spinner from '$lib/components/Spinner.svelte';
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
	import DashboardFilter from '$lib/components/dashboard/DashboardFilter.svelte';
	import type { RealtimeChannel } from '@supabase/supabase-js';

	// Enhanced location type with deviceCount property
	interface LocationWithCount extends LocationWithDevices {
		deviceCount: number;
	}

	// Create a timer manager instance
	const timerManager = new DeviceTimerManager();

	let channel: RealtimeChannel | undefined = $state();

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
					location.cw_devices.forEach((device) => {
						if (device.dev_eui && !(device.dev_eui in deviceActiveStatus)) {
							deviceActiveStatus[device.dev_eui] = null;
						}
					});
				}
			});
		}
	});

	// Device reordering handler
	function handleDeviceReorder(locationId: number, newDevices: any) {
		// Update the location's devices in the store
		const location = locationsStore.locations.find((loc) => loc.location_id === locationId);
		if (location) {
			location.cw_devices = newDevices;
			// Note: Since we're modifying the objects within the array, reactivity should work
			// If needed, we could call a store method to update the locations
		}
	}

	$effect(() => {
		function handleVisibilityChange() {
			isTabVisible = document.visibilityState === 'visible';
			if (isTabVisible) {
				if (browser) {
					console.log('Tab is visible - refreshing data');
					const savedState = localStorage.getItem('sidebar_collapsed');
					if (savedState !== null) {
						sidebarCollapsed = savedState === 'true';
					}
					setupRealtimeSubscription();
				}
			} else {
				console.log('Tab is not visible');
				data.supabase.removeAllChannels();
				cleanupTimers();
				cleanupRealtimeSubscription();
				if (channel) {
					data.supabase.realtime.removeChannel(channel);
				}
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
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
		channel = data.supabase
			.channel('db-changes')
			.on(
				'postgres_changes',
				{
					event: 'UPDATE',
					schema: 'public',
					table: 'cw_devices'
				},
				(payload) => {
					// Handle real-time updates for messages
					if (payload.eventType === 'UPDATE') {
						console.log('🔔 Real-time update received:', payload);
						handleRealtimeUpdate(payload);
					}
				}
			)
			.subscribe();
	}

	// Handle real-time update
	function handleRealtimeUpdate(payload: any) {
		// Only process if we have valid data
		if (!payload) return;
		if (payload.new && payload.new.dev_eui) {
			try {
				// Update device active timer for the updated device
				const device = locationsStore.devices.find((d) => d.dev_eui === payload.new.dev_eui);
				if (!device) {
					console.warn('Device not found for real-time update:', payload.new.dev_eui);
					return;
				}
				// Update the device's last_data_updated_at success
				console.log('Updating device from real-time:', payload.new.dev_eui);
				device.last_data_updated_at = payload.new.last_data_updated_at;
				setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
			} catch (error) {
				console.error('Error updating device from real-time:', error);
			}
		}
	}

	function cleanupRealtimeSubscription() {
		if (realtimeChannel) {
			data.supabase.removeAllChannels();
			realtimeChannel = null;
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
	onDestroy(() => {
		console.log('the component is being destroyed');
		if (data.supabase.realtime.connectionState === 'CONNECTED') {
			console.log('Disconnecting from Supabase real-time...');
			data.supabase.removeAllChannels();
			cleanupRealtimeSubscription();
			if (channel) {
				data.supabase.realtime.removeChannel(channel);
			}
		}
		cleanupTimers();
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
		<div class="devices-panel">
			<!-- Dashboard search/filter -->
			<DashboardFilter />
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
				{:else}
					<!-- Show all locations ("All Locations" is selected) -->
					<AllDevices
						locations={locationsStore.locations}
						{deviceActiveStatus}
						enableDragAndDrop={true}
						onDeviceReorder={handleDeviceReorder}
					/>
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
