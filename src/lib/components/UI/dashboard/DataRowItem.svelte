<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Device } from '$lib/models/Device';
	import type { Location } from '$lib/models/Location';
	import { nameToEmoji } from '$lib/utilities/NameToEmoji';
	import { formatNumber } from '$lib/utilities/stats';
	import { mdiArrowRight } from '@mdi/js';
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Collapse } from 'svelte-ux';
	import Button from './components/Button.svelte';

	// Extend the Device type to include latestData
	interface DeviceWithLatestData extends Device {
		latestData: Record<string, any>;
		cw_device_type: {
			name: string;
			default_upload_interval?: number;
			primary_data_v2?: string | null;
			secondary_data_v2?: string | null;
			primary_data_notation?: string;
			secondary_data_notation?: string;
		};
	}

	let {
		device,
		location,
		isActive: externalIsActive,
		detailHref,
		children
	} = $props<{
		device: DeviceWithLatestData;
		location?: Location;
		isActive?: boolean;
		detailHref?: string;
		children?: Snippet;
	}>();

	// Use the isActive prop directly from the parent component
	// This simplifies the component and ensures consistent active status logic
	// Start with a neutral 'loading' state until we get confirmation from the timer logic
	let isActive = $derived(
		externalIsActive !== undefined
			? externalIsActive === null
				? null
				: Boolean(externalIsActive)
			: null
	);

	// Track whether we've received a definitive status update
	let statusConfirmed = $state(false);

	// Update statusConfirmed when we get a definitive status
	$effect(() => {
		// Only set statusConfirmed to true when we have a non-null status
		if (externalIsActive !== undefined && externalIsActive !== null) {
			statusConfirmed = true;
		}
	});

	// Log the active status for debugging
	// $effect(() => {
	// 	//console.log(
	// 		`[DataRowItem] Device ${device.name} (${device.dev_eui}) isActive: ${isActive}, statusConfirmed: ${statusConfirmed}, cw_device_type: ${device.cw_device_type.name}`
	// 	);
	// });

	// Determine the primary and secondary data keys based on device type - using reactive declarations
	let primaryDataKey = $derived(device.cw_device_type.primary_data_v2);
	let secondaryDataKey = $derived(device.cw_device_type.secondary_data_v2);

	// Get the data values - using reactive declarations so they update when latestData changes
	let primaryValue = $derived(device.latestData?.[primaryDataKey]);
	let secondaryValue = $derived(device.latestData?.[secondaryDataKey]);

	// Get the notations - using reactive declarations
	let primaryNotation = $derived(device.cw_device_type.primary_data_notation || '°C');
	let secondaryNotation = $derived(device.cw_device_type.secondary_data_notation || '%');

	// Add a reactive effect to log when data changes
	// $effect(() => {
	// 	//console.log(`DataRowItem: ${device.name} (${device.dev_eui}) data updated:`, {
	// 		primaryKey: primaryDataKey,
	// 		primaryValue,
	// 		secondaryKey: secondaryDataKey,
	// 		secondaryValue,
	// 		timestamp: device.latestData?.created_at
	// 	});
	// });

	let localStorageOpenState = localStorage.getItem(`${device.dev_eui}-collapseState`);
	let defaultCollapse = $state(localStorageOpenState ? JSON.parse(localStorageOpenState) : false);

	function collapseStateChange(e: CustomEvent) {
		defaultCollapse = e.detail.open;
		localStorage.setItem(`${device.dev_eui}-collapseState`, JSON.stringify(e.detail.open));
	}

	// $effect(() => {
	// 	$inspect('device', device, 'latestData', device.latestData);
	// });
</script>

<Collapse
	classes={{
		root: 'mb-1 bg-gray-200 dark:bg-gray-800/30 w-full ',
		icon: 'text-gray-400 dark:text-gray-500 data-[open=true]:rotate-90'
	}}
	open={defaultCollapse}
	on:change={(e) => collapseStateChange(e)}
>
	<!-- Use a four-state color system for better UX:
	     - Blue-gray (loading): Initial state before status is confirmed
	     - Blue (neutral): When we don't have data
	     - Green: When device is confirmed active with recent data
	     - Red: When device is confirmed inactive (data too old)
	-->
	<div slot="trigger" class="relative flex flex-1">
		<!-- Status indicator -->
		<div
			class="absolute top-0 bottom-0 left-0 my-1 w-1.5 rounded-full opacity-70"
			class:bg-blue-300={!statusConfirmed || isActive === null}
			class:bg-blue-400={statusConfirmed && !device.latestData?.created_at}
			class:bg-green-500={statusConfirmed && isActive}
			class:bg-red-500={statusConfirmed && !isActive && device.latestData?.created_at}
		></div>

		<div class="my-1 mr-2 ml-2 flex-1 border-r-2">
			<div class="flex flex-col text-base">
				<div class="justify-left flex flex-row">
					<b class="ml-4 pb-1 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300"
						>{device.name || `Device ${device.dev_eui}`}</b
					>
				</div>
				<div class="flex flex-row justify-center space-x-5 px-10">
					{#if device.latestData}
						<div class="flex items-center">
							<span class="mr-1.5 text-lg text-gray-500 dark:text-gray-400"
								>{nameToEmoji(primaryDataKey)}</span
							>
							<div class="flex flex-col items-start">
								<span class="text-lg leading-tight font-bold text-gray-900 dark:text-white">
									{formatNumber({ key: primaryDataKey, value: primaryValue })}
									<span
										class="text-accent-700 dark:text-accent-400 ml-0.5 align-top text-xs font-normal"
										>{primaryNotation}</span
									>
								</span>
								<!-- <span class="text-xs text-gray-500 dark:text-gray-400">{$_(primaryDataKey)}</span> -->
							</div>
						</div>

						{#if secondaryDataKey}
							<span class="flex flex-grow-1"></span>
							<div class="flex items-center">
								<span class="mr-1.5 text-lg text-gray-500 dark:text-gray-400"
									>{nameToEmoji(secondaryDataKey)}</span
								>
								<div class="flex flex-col items-start">
									<span class="text-lg leading-tight font-bold text-gray-900 dark:text-white">
										{formatNumber({ key: secondaryDataKey, value: secondaryValue })}
										<span
											class="text-accent-700 dark:text-accent-400 ml-0.5 align-top text-xs font-normal"
											>{secondaryNotation}</span
										>
									</span>
									<!-- <span class="text-xs text-gray-500 dark:text-gray-400"
										>{$_(secondaryDataKey)}</span
									> -->
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Content from children snippet -->
	{#if children}
		{@render children()}
	{/if}

	{#if detailHref || location}
		<Button
			text={$_('View Details')}
			iconPath={mdiArrowRight}
			onClick={() =>
				goto(`/app/dashboard/location/${device.location_id}/devices/${device.dev_eui}`)}
		/>
	{/if}
</Collapse>
