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
	import DashboardFilter from '$lib/components/dashboard/DashboardFilter.svelte';
	import type { RealtimeChannel } from '@supabase/supabase-js';

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
	const TEN_MINUTES_IN_MS = 10 * 60 * 1000;

	let locationRefreshIntervals = $state<Record<number, number>>({});
	let locationRefreshInFlight = $state<Record<number, boolean>>({});

	let channel: RealtimeChannel | undefined = $state();
	let broadcastChannel: RealtimeChannel | undefined = $state();

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

	// Device reordering handler
	function handleDeviceReorder(locationId: number, newDevices: DeviceWithSensorData[]) {
		// Update the location's devices in the store
		const location = locationsStore.locations.find((loc) => loc.location_id === locationId);
		if (location) {
			location.cw_devices = newDevices;
			// Note: Since we're modifying the objects within the array, reactivity should work
			// If needed, we could call a store method to update the locations
		}
	}

	function getLocationsWithInactiveDevices(): number[] {
		const inactiveLocationIds: number[] = [];
		const currentLocations = locationsStore.locations;
		const currentStatuses = deviceActiveStatus;
		if (!currentLocations || currentLocations.length === 0) return inactiveLocationIds;
		currentLocations.forEach((location) => {
			if (!location?.location_id) return;
			const hasInactiveDevice = (location.cw_devices ?? []).some((device: DeviceWithSensorData) => {
				const devEui = device?.dev_eui ?? null;
				if (!devEui) return false;
				return currentStatuses[devEui] === false;
			});
			if (hasInactiveDevice) inactiveLocationIds.push(location.location_id);
		});
		return inactiveLocationIds;
	}

	async function refreshLocationById(locationId: number, reason: string) {
		if (!browser || !locationId) return;
		if (locationRefreshInFlight[locationId]) return;
		locationRefreshInFlight[locationId] = true;
		try {
			const refreshed = await refreshDevicesForLocation(locationId);
			if (!refreshed) {
				console.warn(`Refresh for location ${locationId} (${reason}) returned false.`);
			}
		} catch (error) {
			console.error(`Failed to refresh location ${locationId} (${reason})`, error);
		} finally {
			locationRefreshInFlight[locationId] = false;
		}
	}

	function ensureLocationRefreshInterval(locationId: number, reason: string) {
		if (!browser || !locationId) return;
		if (!locationRefreshIntervals[locationId]) {
			void refreshLocationById(locationId, reason);
			locationRefreshIntervals[locationId] = window.setInterval(() => {
				void refreshLocationById(locationId, 'interval');
			}, TEN_MINUTES_IN_MS);
		}
	}

	function clearLocationRefreshInterval(locationId: number) {
		const intervalId = locationRefreshIntervals[locationId];
		if (intervalId) {
			clearInterval(intervalId);
			delete locationRefreshIntervals[locationId];
		}
	}

	function clearAllLocationRefreshIntervals() {
		Object.keys(locationRefreshIntervals).forEach((id) => {
			clearLocationRefreshInterval(Number(id));
		});
	}

	function refreshInactiveLocations(reason: string) {
		const inactiveLocationIds = getLocationsWithInactiveDevices();
		inactiveLocationIds.forEach((locationId) => ensureLocationRefreshInterval(locationId, reason));
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
					setupBroadcastSubscription();
					setupRealtimeSubscription();
					refreshInactiveLocations('tab-visible');
				}
			} else {
				console.log('Tab is not visible');
				cleanupTimers();
				cleanupRealtimeSubscription();
				cleanupBroadcastSubscription();
				clearAllLocationRefreshIntervals();
			}
		}
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});

	$effect(() => {
		if (!browser || !isTabVisible) return;
		const inactiveLocationIds = new Set(getLocationsWithInactiveDevices());
		inactiveLocationIds.forEach((locationId) =>
			ensureLocationRefreshInterval(locationId, 'inactive-device')
		);
		Object.keys(locationRefreshIntervals).forEach((id) => {
			const locationId = Number(id);
			if (!inactiveLocationIds.has(locationId)) {
				clearLocationRefreshInterval(locationId);
			}
		});
	});

	// Initialize the dashboard UI store for preferences
	const uiStore = getDashboardUIStore();

	// Sidebar collapsed state
	let sidebarCollapsed = $state(false);

	// Setup real-time subscriptions with retry logic
	function setupRealtimeSubscription(retryCount = 0) {
		if (!browser) return;
		setupBroadcastSubscription();
		if (channel) return;

		console.log('🔄 Setting up real-time subscription...');
		channel = data.supabase
			.channel('db-changes')
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cw_air_data'
				},
				(payload) => {
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
					// Handle real-time updates for users
					if (payload.eventType === 'INSERT') {
						// You can handle user updates here if needed
						handleRealtimeUpdate(payload);
					}
				}
			)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'cw_traffic2'
				},
				(payload) => {
					// Handle real-time updates for users
					if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
						// You can handle user updates here if needed
						handleRealtimeUpdate(payload);
					}
				}
			)
			.subscribe((status, err) => {
				console.debug('[Dashboard] DB channel status', { status, err });
				if (status === 'CHANNEL_ERROR') {
					console.error('DB channel error', err);
				}
			});

		setupBroadcastSubscription();
	}

	// Handle real-time update
	async function handleRealtimeUpdate(payload: any) {
		// Only process if we have valid data
		if (payload.new && payload.new.dev_eui) {
			const tableName = payload.table;
			console.debug('[Dashboard] Postgres change received', {
				eventType: payload.eventType,
				table: tableName,
				dev_eui: payload.new.dev_eui,
				created_at: payload.new.created_at
			});
			if (tableName === 'cw_traffic2') {
				try {
					const response = await fetch(`/api/devices/${payload.new.dev_eui}/status`);
					if (!response.ok) {
						console.warn(
							`[Dashboard] Failed to refresh aggregated traffic data for ${payload.new.dev_eui}`,
							response.status
						);
						return;
					}
					const aggregated = await response.json();
					applyDeviceDataUpdate(aggregated as AirData | SoilData);
				} catch (err) {
					console.error(
						`[Dashboard] Error refreshing aggregated traffic data for ${payload.new.dev_eui}`,
						err
					);
				}
				return;
			}
			applyDeviceDataUpdate(payload.new as AirData | SoilData);
		} else {
			console.debug('[Dashboard] Postgres change ignored', payload);
		}
	}

	function applyDeviceDataUpdate(record: AirData | SoilData) {
		console.debug('[Dashboard] Applying device update', {
			recordDevEui: record?.dev_eui,
			timestamp: record?.created_at,
			source: record?.data_source ?? 'unknown'
		});
		if (!record?.dev_eui) return;
		try {
			const beforeDevice = locationsStore.devices.find((d) => d.dev_eui === record.dev_eui);
			console.debug('[Dashboard] Device snapshot before update', {
				found: Boolean(beforeDevice),
				latestCreatedAt: beforeDevice?.latestData?.created_at
			});
			locationsStore.updateSingleDevice(record.dev_eui, record);

			const device = locationsStore.devices.find((d) => d.dev_eui === record.dev_eui);
			if (device && device.latestData?.created_at) {
				setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
			}

			console.debug('[Dashboard] Device snapshot after update', {
				found: Boolean(device),
				latestCreatedAt: device?.latestData?.created_at
			});

			lastRefresh = new Date();
		} catch (error) {
			console.error('Error applying device data update:', error);
		}
	}

	function setupBroadcastSubscription() {
		if (!browser) return;
		if (broadcastChannel) return;

		console.log('📡 Setting up broadcast subscription...');
		broadcastChannel = data.supabase
			.channel('cw_air_data', { config: { private: true } })
			.on('broadcast', { event: 'INSERT' }, (payload) => {
				const record = payload?.payload?.record;
				console.debug('[Dashboard] Broadcast INSERT received', {
					payload,
					dev_eui: record?.dev_eui
				});
				if (record?.dev_eui) {
					applyDeviceDataUpdate(record as AirData | SoilData);
				}
			})
			.on('broadcast', { event: 'UPDATE' }, (payload) => {
				const record = payload?.payload?.record;
				console.debug('[Dashboard] Broadcast UPDATE received', {
					payload,
					dev_eui: record?.dev_eui
				});
				if (record?.dev_eui) {
					applyDeviceDataUpdate(record as AirData | SoilData);
				}
			})
			.subscribe((status, err) => {
				console.debug('[Dashboard] Broadcast channel status', { status, err });
				if (status === 'CHANNEL_ERROR') {
					console.error('Broadcast channel error', err);
				}
				if (status === 'TIMED_OUT') {
					console.warn('Broadcast channel timed out');
				}
				if (status === 'CLOSED') {
					console.warn('Broadcast channel closed');
					broadcastChannel = undefined;
				}
			});
	}

	function cleanupRealtimeSubscription() {
		if (channel) {
			data.supabase.removeChannel(channel);
			channel = undefined;
		}
	}

	function cleanupBroadcastSubscription() {
		if (broadcastChannel) {
			data.supabase.removeChannel(broadcastChannel);
			broadcastChannel = undefined;
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
		cleanupTimers();
		cleanupRealtimeSubscription();
		cleanupBroadcastSubscription();
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
		clearAllLocationRefreshIntervals();
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
	// async function selectLocation(locationId: number | null) {
	// 	//console.log('Dashboard selectLocation called with:', locationId);
	// 	//console.log('Current selectedLocationId:', locationsStore.selectedLocationId);

	// 	// If already selected, do nothing
	// 	if (locationsStore.selectedLocationId === locationId) {
	// 		//console.log('Location already selected, returning');
	// 		return;
	// 	}

	// 	// Clean up any existing polling before changing location
	// 	timerManager.cleanupPolling();

	// 	// Use the store to select location and load devices
	// 	//console.log('Calling store.selectLocation with:', locationId);
	// 	await locationsStore.selectLocation(locationId);
	// 	//console.log(
	// 	// 	'After store.selectLocation, selectedLocationId is:',
	// 	// 	locationsStore.selectedLocationId
	// 	// );

	// 	// Setup active timers for each device
	// 	locationsStore.devices.forEach((device: DeviceWithSensorData) => {
	// 		if (device.latestData?.created_at) {
	// 			setupDeviceActiveTimer(device, timerManager, deviceActiveStatus);
	// 		}
	// 	});

	// 	// Set up polling only for specific locations, not for "All Locations"
	// 	if (locationId !== null) {
	// 		timerManager.setupPolling(locationId, refreshDevicesForLocation);
	// 	}
	// }

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
					{#if selectedLoc}
						<AllDevices
							locations={[selectedLoc]}
							{deviceActiveStatus}
							enableDragAndDrop={true}
							onDeviceReorder={handleDeviceReorder}
						/>
					{:else}
						<div class="error">Selected location not found.</div>
					{/if}
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
