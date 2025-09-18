<!--
  DragDropDemo.svelte
  Demonstrates the drag and drop functionality for DataRowItems
-->
<script lang="ts">
	import DataRowItem from '$lib/components/UI/dashboard/DataRowItem.svelte';
	import { createDragState, createDragHandlers, type DragState } from '$lib/utilities/dragAndDrop';

	interface DemoDevice {
		dev_eui: string;
		name: string;
		location_id: number;
		latestData: Record<string, any>;
		cw_device_type: {
			name: string;
			primary_data_v2?: string;
			secondary_data_v2?: string;
			primary_data_notation?: string;
			secondary_data_notation?: string;
		};
	}

	// Sample device data for demonstration
	let devices: DemoDevice[] = $state([
		{
			dev_eui: 'device-1',
			name: 'Temperature Sensor 1',
			location_id: 1,
			latestData: { temperature: 22.5, humidity: 65 },
			cw_device_type: {
				name: 'Air Sensor',
				primary_data_v2: 'temperature',
				secondary_data_v2: 'humidity',
				primary_data_notation: '°C',
				secondary_data_notation: '%'
			}
		},
		{
			dev_eui: 'device-2',
			name: 'Temperature Sensor 2',
			location_id: 1,
			latestData: { temperature: 24.1, humidity: 58 },
			cw_device_type: {
				name: 'Air Sensor',
				primary_data_v2: 'temperature',
				secondary_data_v2: 'humidity',
				primary_data_notation: '°C',
				secondary_data_notation: '%'
			}
		},
		{
			dev_eui: 'device-3',
			name: 'Temperature Sensor 3',
			location_id: 1,
			latestData: { temperature: 20.8, humidity: 72 },
			cw_device_type: {
				name: 'Air Sensor',
				primary_data_v2: 'temperature',
				secondary_data_v2: 'humidity',
				primary_data_notation: '°C',
				secondary_data_notation: '%'
			}
		}
	]);

	// Drag and drop state
	let dragState: DragState = $state(createDragState());
	let dragEnabled = $state(true);

	function updateDragState(newState: Partial<DragState>) {
		dragState = { ...dragState, ...newState };
	}

	// Handle device reordering
	function handleDeviceReorder(newDevices: DemoDevice[]) {
		devices = newDevices;
		console.log(
			'Devices reordered:',
			newDevices.map((d: DemoDevice) => d.name)
		);
	}

	// Create drag handlers
	let dragHandlers = $derived(
		createDragHandlers(devices, handleDeviceReorder, dragState, updateDragState)
	);
</script>

<div class="mx-auto max-w-2xl p-4">
	<h1 class="mb-4 text-2xl font-bold">Drag & Drop Demo</h1>

	<div class="mb-4">
		<label class="flex items-center space-x-2">
			<input type="checkbox" bind:checked={dragEnabled} class="rounded" />
			<span>Enable Drag & Drop</span>
		</label>
	</div>

	<div class="space-y-2">
		<h2 class="text-lg font-semibold">DataRowItems (drag by red handle):</h2>

		{#each devices as device, index (device.dev_eui)}
			<DataRowItem
				{device}
				isActive={true}
				detailHref={`/device/${device.dev_eui}`}
				{dragEnabled}
				dragIndex={index}
				isDragging={dragState.draggedIndex === index}
				isDropTarget={dragState.dropTargetIndex === index}
				onDragStart={dragHandlers.handleDragStart}
				onDragEnd={dragHandlers.handleDragEnd}
				onDragOver={dragHandlers.handleDragOver}
				onDrop={dragHandlers.handleDrop}
			/>
		{/each}
	</div>

	<div class="mt-8 rounded bg-gray-100 p-4 dark:bg-gray-800">
		<h3 class="mb-2 font-semibold">Instructions:</h3>
		<ul class="space-y-1 text-sm">
			<li>• Enable the checkbox above to activate drag & drop</li>
			<li>• Click and drag the colored bar on the left of each item</li>
			<li>• Drop the item at a new position to reorder</li>
			<li>• Check the console for reorder events</li>
		</ul>
	</div>

	<div class="mt-4 rounded bg-blue-50 p-4 dark:bg-blue-900/20">
		<h3 class="mb-2 font-semibold">Current Order:</h3>
		<ol class="space-y-1 text-sm">
			{#each devices as device, index}
				<li>{index + 1}. {device.name}</li>
			{/each}
		</ol>
	</div>
</div>
