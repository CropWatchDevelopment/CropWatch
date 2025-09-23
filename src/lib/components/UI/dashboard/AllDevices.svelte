<script lang="ts">
	import type { Location } from '$lib/models/Location';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { AirData } from '$lib/models/AirData';
	import type { SoilData } from '$lib/models/SoilData';
	import DashboardCard from './DashboardCard.svelte';
	import DeviceCard from './DeviceCard.svelte';
	import { isDeviceActive } from '$lib/utilities/dashboardHelpers';
	import { getDashboardUIStore } from '$lib/stores/DashboardUIStore.svelte';
	import { createDragState, createDragHandlers, type DragState } from '$lib/utilities/dragAndDrop';
	import { saveDeviceOrder, applyStoredDeviceOrder } from '$lib/utilities/deviceOrderStorage';

	// Extended Location type to include cw_devices property
	interface LocationWithDevices extends Location {
		cw_devices?: DeviceWithSensorData[];
		deviceCount?: number;
	}

	// Enhanced device type with latest sensor data
	interface DeviceWithSensorData extends DeviceWithType {
		latestData: AirData | SoilData | null;
		cw_rules?: any[];
	}

	let {
		locations,
		deviceActiveStatus,
		onDeviceReorder,
		enableDragAndDrop = false
	} = $props<{
		locations: LocationWithDevices[];
		deviceActiveStatus: Record<string, boolean | null | undefined>;
		onDeviceReorder?: (locationId: number, newDevices: DeviceWithSensorData[]) => void;
		enableDragAndDrop?: boolean;
	}>();

	// Get the UI store to access the view type and search
	const uiStore = getDashboardUIStore();

	// Create drag states for each location
	let dragStates: Map<number, DragState> = $state(new Map());

	function getDragState(locationId: number): DragState {
		if (!dragStates.has(locationId)) {
			dragStates.set(locationId, createDragState());
		}
		return dragStates.get(locationId)!;
	}

	function updateDragState(locationId: number, newState: Partial<DragState>) {
		const currentState = getDragState(locationId);
		const updatedState = { ...currentState, ...newState };
		dragStates.set(locationId, updatedState);
		// Force reactivity by reassigning the Map
		dragStates = new Map(dragStates);
	}

	// Reactive filtered locations based on search with applied device order
	const filteredLocations = $derived(
		locations
			.filter((location: LocationWithDevices) => {
				// If search is empty, show all locations
				if (!uiStore.search?.trim()) return true;

				// Check if location name matches search
				if (location.name.toLowerCase().includes(uiStore.search.toLowerCase())) return true;

				// Check if any device in the location matches search
				if (location.cw_devices && location.cw_devices.length > 0) {
					return location.cw_devices.some(
						(device: DeviceWithSensorData) =>
							device.name?.toLowerCase().includes(uiStore.search.toLowerCase()) ||
							device.dev_eui?.toLowerCase().includes(uiStore.search.toLowerCase()) ||
							device.cw_device_type?.name?.toLowerCase().includes(uiStore.search.toLowerCase())
					);
				}

				return false;
			})
			.map((location: LocationWithDevices) => ({
				...location,
				cw_devices: location.cw_devices
					? applyStoredDeviceOrder(location.cw_devices, location.location_id)
					: []
			}))
	);

	// Function to get container class based on view type
	function getContainerClass(viewType: string): string {
		switch (viewType) {
			case 'grid':
				return 'w-full grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
			case 'mozaic':
				return 'columns-[20rem] gap-4 space-y-4';
			case 'list':
				return 'flex flex-col gap-4';
			default:
				return 'w-full grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
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
			{@const hasLoadingStatus = (location.cw_devices ?? []).some(
				(d: DeviceWithSensorData) => deviceActiveStatus[d.dev_eui] === undefined
			)}
			{@const activeDevices = (location.cw_devices ?? []).filter((d: DeviceWithSensorData) =>
				isDeviceActive(d, deviceActiveStatus)
			)}
			{@const allActive =
				(location.cw_devices?.length ?? 0) > 0 &&
				activeDevices.length === (location.cw_devices?.length ?? 0)}
			{@const allInactive = (location.cw_devices?.length ?? 0) > 0 && activeDevices.length === 0}
			<DashboardCard
				{location}
				href={`/app/dashboard/location/${location.location_id}`}
				{activeDevices}
				{allActive}
				{allInactive}
				loading={hasLoadingStatus}
			>
				{#snippet content()}
					{@const locationDevices = location.cw_devices ?? []}
					{@const dragHandlers = createDragHandlers(
						locationDevices,
						(newDevices) => {
							// Save the new order to localStorage
							const deviceOrder = newDevices.map((device) => device.dev_eui);
							saveDeviceOrder(location.location_id, deviceOrder);

							if (onDeviceReorder) {
								onDeviceReorder(location.location_id, newDevices);
							}
						},
						getDragState(location.location_id),
						(newState) => updateDragState(location.location_id, newState)
					)}
					{#each locationDevices as device, index (device.dev_eui)}
						{@const isActive = isDeviceActive(device, deviceActiveStatus)}
						{@const formattedDevice = {
							...device,
							latestData: device.latestData || {},
							cw_device_type: {
								name: device.cw_device_type?.name || 'Unknown',
								default_upload_interval: device.cw_device_type?.default_upload_interval || 10,
								primary_data_notation: device.cw_device_type?.primary_data_notation || '',
								secondary_data_notation:
									device.cw_device_type?.secondary_data_notation || undefined,
								primary_data_v2: device.cw_device_type?.primary_data_v2 || undefined,
								secondary_data_v2: device.cw_device_type?.secondary_data_v2 || undefined
							}
						}}
						<DeviceCard
							device={formattedDevice}
							{isActive}
							locationId={location.location_id}
							dragEnabled={enableDragAndDrop}
							dragIndex={index}
							isDragging={getDragState(location.location_id).draggedIndex === index}
							isDropTarget={getDragState(location.location_id).dropTargetIndex === index}
							onDragStart={dragHandlers.handleDragStart}
							onDragEnd={dragHandlers.handleDragEnd}
							onDragOver={dragHandlers.handleDragOver}
							onDrop={dragHandlers.handleDrop}
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
		width: 100%;
		min-width: 250px;
		margin: 0; /* Remove auto margin to align left */
	}
</style>
