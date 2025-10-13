<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Device } from '$lib/models/Device';
	import type { Location } from '$lib/models/Location';
	import { nameToEmoji } from '$lib/utilities/NameToEmoji';
	import { formatNumber } from '$lib/utilities/stats';
	import { getDeviceLatestTimestamp } from '$lib/utilities/deviceUtils';
	import { mdiArrowDown, mdiArrowRight, mdiArrowUp } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import Collapse from '$lib/components/ui/base/Collapse.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';

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
		children,
		onDragStart,
		onDragEnd,
		onDragOver,
		onDrop,
		isDragging = false,
		isDropTarget = false,
		dragIndex,
		dragEnabled = false
	} = $props<{
		device: DeviceWithLatestData;
		location?: Location;
		isActive?: boolean;
		detailHref?: string;
		children?: any; // snippet passed by parent
		onDragStart?: (event: DragEvent, index: number) => void;
		onDragEnd?: (event: DragEvent) => void;
		onDragOver?: (event: DragEvent, index: number) => void;
		onDrop?: (event: DragEvent, index: number) => void;
		isDragging?: boolean;
		isDropTarget?: boolean;
		dragIndex?: number;
		dragEnabled?: boolean;
	}>();

	let isActive = $derived(
		externalIsActive !== undefined
			? externalIsActive === null
				? null
				: Boolean(externalIsActive)
			: null
	);
	let statusConfirmed = $state(false);
	$effect(() => {
		if (externalIsActive !== undefined && externalIsActive !== null) statusConfirmed = true;
	});

	let primaryDataKey = $derived(device.cw_device_type.primary_data_v2);
	let secondaryDataKey = $derived(device.cw_device_type.secondary_data_v2);
	let primaryValue = $derived(device.latestData?.[primaryDataKey]);
	let secondaryValue = $derived(device.latestData?.[secondaryDataKey]);
	let primaryNotation = $derived(device.cw_device_type.primary_data_notation || '°C');
	let secondaryNotation = $derived(device.cw_device_type.secondary_data_notation || '%');
	let latestTimestamp = $derived(() => getDeviceLatestTimestamp(device));

	let localStorageOpenState =
		typeof localStorage !== 'undefined'
			? localStorage.getItem(`${device.dev_eui}-collapseState`)
			: null;
	let defaultCollapse = $state(localStorageOpenState ? JSON.parse(localStorageOpenState) : false);
	function collapseStateChange(e: CustomEvent) {
		defaultCollapse = e.detail.open;
		if (typeof localStorage !== 'undefined')
			localStorage.setItem(`${device.dev_eui}-collapseState`, JSON.stringify(e.detail.open));
	}
</script>

{#snippet triggerSnippet()}
	<div
		class="relative flex flex-1"
		class:opacity-50={isDragging}
		class:ring-2={isDropTarget}
		class:ring-blue-400={isDropTarget}
		class:bg-blue-50={isDropTarget &&
			typeof window !== 'undefined' &&
			!window.matchMedia('(prefers-color-scheme: dark)').matches}
		style={isDropTarget &&
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'background-color: rgba(30, 58, 138, 0.2);'
			: ''}
		role="listitem"
		ondragover={(e) => {
			if (dragEnabled && onDragOver && dragIndex !== undefined) {
				e.preventDefault();
				onDragOver(e, dragIndex);
			}
		}}
		ondrop={(e) => {
			if (dragEnabled && onDrop && dragIndex !== undefined) {
				e.preventDefault();
				onDrop(e, dragIndex);
			}
		}}
	>
		<div
			class="absolute top-0 bottom-0 left-0 my-1 w-1.5 rounded-full opacity-70 transition-all duration-200"
			class:bg-blue-300={!statusConfirmed || isActive === null}
			class:bg-blue-400={statusConfirmed && !latestTimestamp}
			class:bg-green-500={statusConfirmed && isActive}
			class:bg-red-500={statusConfirmed && !isActive && latestTimestamp}
			class:cursor-grab={dragEnabled}
			class:cursor-grabbing={isDragging}
			class:hover:opacity-100={dragEnabled}
			class:scale-110={dragEnabled && !isDragging}
			class:hover:scale-125={dragEnabled}
			role="button"
			tabindex={dragEnabled ? 0 : -1}
			aria-label={dragEnabled ? 'Drag to reorder' : ''}
			draggable={dragEnabled}
			ondragstart={(e) => {
				if (dragEnabled && onDragStart && dragIndex !== undefined && e.dataTransfer) {
					e.dataTransfer.effectAllowed = 'move';
					e.dataTransfer.setData('text/plain', device.dev_eui);
					onDragStart(e, dragIndex);
				}
			}}
			ondragend={(e) => {
				if (dragEnabled && onDragEnd) {
					onDragEnd(e);
				}
			}}
			title={dragEnabled ? 'Drag to reorder' : ''}
		></div>
		<div class="my-1 mr-2 ml-2 flex-1 border-r-2">
			<div class="flex flex-col text-base">
				<div class="justify-left flex flex-row pl-0">
					<b class="ml-4 pb-1 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300"
						>{device.name || `Device ${device.dev_eui}`}</b
					>
				</div>
				<div class="flex w-full flex-row justify-between justify-center space-x-5">
					{#if device.latestData}
						<div class="flex items-center">
							<span class="mr-1.5 text-lg text-gray-600 dark:text-gray-400"
								>{nameToEmoji(primaryDataKey)}</span
							>
							<div class="flex flex-col items-start">
								<span
									class="text-lg leading-tight font-bold whitespace-nowrap text-gray-900 dark:text-white"
								>
									{formatNumber({ key: primaryDataKey, value: primaryValue })}
									<span
										class="text-accent-700 dark:text-accent-400 ml-0.5 align-top text-xs font-normal"
										>{primaryNotation}</span
									>
								</span>
							</div>
						</div>
						{#if secondaryDataKey}
							<span class="flex flex-grow-[0.2]"></span>
							<div class="flex items-center">
								<span class="mr-1.5 text-lg text-gray-600 dark:text-gray-400"
									>{nameToEmoji(secondaryDataKey)}</span
								>
								<div class="no-wrap flex flex-col items-start">
									<span
										class="flex flex-nowrap items-baseline text-lg leading-tight font-bold text-gray-900 dark:text-white"
									>
										<span>{formatNumber({ key: secondaryDataKey, value: secondaryValue })}</span>
										<span class="text-accent-700 dark:text-accent-400 ml-0.5 text-xs font-normal"
											>{secondaryNotation}</span
										>
									</span>
								</div>
							</div>
						{/if}
					{/if}
				</div>
			</div>
		</div>
		<div class="flex items-center pr-2">
			<svg
				viewBox="0 0 24 24"
				class="h-5 w-5 text-gray-600 dark:text-gray-400"
				fill="currentColor"
				aria-hidden="true"
			>
				{#if defaultCollapse}
					<path d={mdiArrowUp} />
				{:else}
					<path d={mdiArrowDown} />
				{/if}
			</svg>
		</div>
	</div>
{/snippet}

{#snippet collapseChildren()}
	<div class="space-y-2">
		{#if children}
			{@render children()}
		{/if}
		{#if detailHref || location}
			<Button
				variant="secondary"
				size="sm"
				class="w-full justify-center"
				onclick={() =>
					goto(`/app/dashboard/location/${device.location_id}/devices/${device.dev_eui}`)}
			>
				<span class="flex items-center gap-2">
					{$_('View Details')}
					<svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
						<path d={mdiArrowRight} />
					</svg>
				</span>
			</Button>
		{/if}
	</div>
{/snippet}

<Collapse
	classes={{
		root: 'mb-1 bg-gray-200 dark:bg-gray-800/30 w-full ',
		icon: 'text-gray-600 dark:text-gray-500 data-[open=true]:rotate-90'
	}}
	open={defaultCollapse}
	on:change={(e) => collapseStateChange(e)}
	trigger={triggerSnippet}
	children={collapseChildren}
/>
