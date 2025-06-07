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
		deviceActiveStatus: Record<string, boolean>;
	}>()
	
	// Get the UI store to access the view type
	const uiStore = getDashboardUIStore();
	
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
	{#each locations as location (location.location_id)}
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
</div>

<style>
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
