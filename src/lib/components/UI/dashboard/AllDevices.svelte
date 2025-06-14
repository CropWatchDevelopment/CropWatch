<script lang="ts">
	import type { Location } from '$lib/models/Location';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { AirData } from '$lib/models/AirData';
	import type { SoilData } from '$lib/models/SoilData';
	import DashboardCard from './DashboardCard.svelte';
	import DeviceCard from './DeviceCard.svelte';
	import { isDeviceActive } from '$lib/utilities/dashboardHelpers';
	import { getDashboardUIStore } from '$lib/stores/DashboardUIStore.svelte';

	// Extended Location type to include cw_devices property
	interface LocationWithDevices extends Location {
		cw_devices?: DeviceWithSensorData[];
		deviceCount?: number;
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

	let { locations, deviceActiveStatus } = $props<{
		locations: LocationWithDevices[];
		deviceActiveStatus: Record<string, boolean | null>;
	}>()
	
	// Get the UI store to access the view type and search
	const uiStore = getDashboardUIStore();
	
	// Debug effect to log search changes
	$effect(() => {
		console.log('AllDevices: uiStore.search changed to:', uiStore.search);
	});
	
	// Track filtered locations count for debugging
	$effect(() => {
		console.log('AllDevices: filteredLocations count:', filteredLocations.length);
		console.log('AllDevices: total locations count:', locations.length);
	});
	
	// Reactive filtered locations based on search
	const filteredLocations = $derived(locations.filter((location: LocationWithDevices) => {

		// If search is empty, show all locations
		if (!uiStore.search?.trim()) return true;
		
		// Check if location name matches search
		if (location.name.toLowerCase().includes(uiStore.search.toLowerCase())) return true;
		
		// Check if any device in the location matches search
		if (location.cw_devices && location.cw_devices.length > 0) {
			return location.cw_devices.some((device: DeviceWithSensorData) => 
				device.name?.toLowerCase().includes(uiStore.search.toLowerCase()) ||
				device.dev_eui?.toLowerCase().includes(uiStore.search.toLowerCase()) ||
				device.deviceType?.name?.toLowerCase().includes(uiStore.search.toLowerCase())
			);
		}
		
		return false;
	}));
	
	// Function to get container class based on view type
	function getContainerClass(viewType: string): string {
		switch (viewType) {
			case 'grid':
				return 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
			case 'mozaic':
				return 'columns-[20rem] gap-4 space-y-4';
			case 'list':
				return 'flex flex-col gap-4';
			default:
				return 'grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
		}
	}
</script>

<div class="device-cards-grid {getContainerClass(uiStore.dashboardViewType)}">
	{#if filteredLocations.length === 0}
		<div class="no-results">
			<p>No locations match your search criteria.</p>
		</div>
	{:else}
		{#each filteredLocations as location (location.location_id)}
			{@const hasNullStatus = (location.cw_devices ?? []).some((d: DeviceWithSensorData) => 
				deviceActiveStatus[d.dev_eui] === null
			)}
			{@const activeDevices = (location.cw_devices ?? []).filter((d: DeviceWithSensorData) =>
				isDeviceActive(d, deviceActiveStatus)
			)}
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
				loading={hasNullStatus}
			>
				{#snippet content()}
					{#each location.cw_devices ?? [] as device (device.dev_eui)}
						{@const isActive = isDeviceActive(device, deviceActiveStatus)}
						{@const formattedDevice = {
							...device,
							latestData: device.latestData || {},
							cw_device_type: {
								name: device.deviceType?.name || 'Unknown',
								default_upload_interval: device.deviceType?.default_upload_interval || 10,
								primary_data_notation: device.deviceType?.primary_data_notation || '',
								secondary_data_notation: device.deviceType?.secondary_data_notation || undefined,
								primary_data_v2: device.deviceType?.primary_data_v2 || undefined,
								secondary_data_v2: device.deviceType?.secondary_data_v2 || undefined
							}
						}}
						<DeviceCard 
							device={formattedDevice} 
							{isActive} 
							locationId={location.location_id} 
						/>
					{/each}
				{/snippet}
			</DashboardCard>
		{/each}
	{/if}
</div>

<style>
	.no-results {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 2rem;
		background-color: var(--color-card);
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.no-results p {
		color: var(--color-text-secondary);
		font-size: 1rem;
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
</style>
