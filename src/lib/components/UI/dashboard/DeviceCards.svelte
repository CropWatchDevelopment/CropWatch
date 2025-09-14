<!--
  DeviceCards.svelte
  A component that displays a grid, list, or mosaic of device cards
-->
<script lang="ts">
	import type { DeviceWithSensorData } from '$lib/utilities/deviceTimerSetup';
	import DeviceCard from '$lib/components/UI/dashboard/DeviceCard.svelte';
	import DataRowItem from '$lib/components/UI/dashboard/DataRowItem.svelte';
	import DeviceDataList from '$lib/components/UI/dashboard/DeviceDataList.svelte';
	import { isDeviceActive, isSoilSensor } from '$lib/utilities/deviceUtils';
	import { getContainerClass } from '$lib/utilities/dashboardLayout';
	import { createDragState, createDragHandlers, type DragState } from '$lib/utilities/dragAndDrop';

	// Props
	let {
		devices = [],
		viewType = 'grid',
		deviceActiveStatus = {},
		selectedDevice = null,
		onDevicesReorder = undefined,
		enableDragAndDrop = false
	} = $props<{
		devices?: DeviceWithSensorData[];
		viewType?: string;
		deviceActiveStatus?: Record<string, boolean>;
		selectedDevice?: string | null;
		onDevicesReorder?: ((newDevices: DeviceWithSensorData[]) => void) | undefined;
		enableDragAndDrop?: boolean;
	}>();

	// Drag and drop state
	let dragState: DragState = $state(createDragState());

	function updateDragState(newState: Partial<DragState>) {
		dragState = { ...dragState, ...newState };
	}

	// Create drag handlers
	let dragHandlers = $derived(
		createDragHandlers(
			devices,
			(newDevices) => {
				if (onDevicesReorder) {
					onDevicesReorder(newDevices);
				}
			},
			dragState,
			updateDragState
		)
	);

	// Function to handle device selection
	function selectDevice(deviceId: string) {
		// Emit a custom event to notify parent component
		const event = new CustomEvent('deviceSelect', { detail: { deviceId } });
		dispatch('deviceSelect', { deviceId });
	}

	// Function to create a dispatch method for custom events
	function createEventDispatcher() {
		return {
			dispatch: (event: string, detail: any) => {
				const customEvent = new CustomEvent(event, { detail });
				document.dispatchEvent(customEvent);
			}
		};
	}
	const { dispatch } = createEventDispatcher();
</script>

<div class="device-cards-grid {getContainerClass(viewType)}">
	{#each devices as device, index (device.dev_eui)}
		<div class="device-card-wrapper">
			{#if viewType === 'list'}
				<div
					onclick={() => selectDevice(device.dev_eui)}
					onkeydown={(e) => e.key === 'Enter' && selectDevice(device.dev_eui)}
					class="cursor-pointer"
					class:selected={selectedDevice === device.dev_eui}
					role="button"
					tabindex="0"
					aria-label="Select device {device.name || device.dev_eui}"
				>
					<DataRowItem
						{device}
						isActive={isDeviceActive(device, deviceActiveStatus)}
						detailHref={`/app/devices/${device.dev_eui}`}
						dragEnabled={enableDragAndDrop}
						dragIndex={index}
						isDragging={dragState.draggedIndex === index}
						isDropTarget={dragState.dropTargetIndex === index}
						onDragStart={dragHandlers.handleDragStart}
						onDragEnd={dragHandlers.handleDragEnd}
						onDragOver={dragHandlers.handleDragOver}
						onDrop={dragHandlers.handleDrop}
					/>
				</div>
			{:else}
				<div
					onclick={() => selectDevice(device.dev_eui)}
					onkeydown={(e) => e.key === 'Enter' && selectDevice(device.dev_eui)}
					class="cursor-pointer"
					class:selected={selectedDevice === device.dev_eui}
					role="button"
					tabindex="0"
					aria-label="Select device {device.name || device.dev_eui}"
				>
					<DeviceCard
						{device}
						isActive={isDeviceActive(device, deviceActiveStatus)}
						locationId={device.location_id || 0}
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	:global(.device-cards-grid.columns-20rem) {
		column-gap: 1rem;
	}

	:global(.device-cards-grid.columns-20rem) > div {
		break-inside: avoid;
		margin-bottom: 1rem;
	}

	:global(.device-cards-grid.columns-20rem) :global(.dashboard-card) {
		height: 100%;
	}

	.device-card-wrapper {
		position: relative;
	}

	.device-cards-grid.flex .device-card-wrapper {
		width: 100%;
		max-width: 100%;
	}

	.device-cards-grid.flex .device-card-wrapper :global(.dashboard-card) {
		width: 100%;
		max-width: 100%;
	}

	:global(.device-cards-grid.columns-20rem) .device-card-wrapper {
		display: inline-block;
		width: 100%;
	}

	.selected {
		outline: 2px solid #3b82f6;
		border-radius: 0.375rem;
	}
</style>
