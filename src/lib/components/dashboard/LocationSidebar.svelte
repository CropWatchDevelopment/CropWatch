<script lang="ts">
	import { browser } from '$app/environment';
	import DashboardFilterBits from '$lib/components/UI/dashboard/DashboardFilterBits.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { Location } from '$lib/models/Location';
	import { getDashboardUIStore } from '$lib/stores/DashboardUIStore.svelte';
	import {
		mdiAlert,
		mdiCheck,
		mdiChevronLeft,
		mdiClockOutline,
		mdiClose,
		mdiEarth,
		mdiMagnify
	} from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import { fade } from 'svelte/transition';

	// Use the same interfaces as in the dashboard page
	interface DeviceWithSensorData extends DeviceWithType {
		// This is just a placeholder to match the dashboard page interface
		// The actual properties would be defined in the dashboard page
	}

	interface LocationWithDevices extends Location {
		cw_devices?: DeviceWithSensorData[];
	}

	interface LocationWithCount extends LocationWithDevices {
		deviceCount: number;
	}

	// Define component props interface
	interface LocationSidebarProps {
		locations: LocationWithCount[];
		selectedLocation: number | null;
		search: string;
		hideEmptyLocations: boolean;
		dashboardViewType: string;
		dashboardSortType: string;
		collapsed: boolean;
		deviceActiveStatus?: Record<string, boolean | null>;
		onSelectLocation: (locationId: number | null) => void;
		onToggleCollapse: () => void;
		onsearch: (search: string) => void;
		onhideEmptyLocationsChange: (value: boolean) => void;
		ondashboardViewTypeChange: (value: string) => void;
		ondashboardSortTypeChange: (value: string) => void;
	}

	// Props using Svelte 5 $props() syntax
	let {
		locations = [],
		selectedLocation = null,
		search = $bindable(''),
		hideEmptyLocations = false,
		dashboardViewType = 'grid',
		dashboardSortType = 'name',
		collapsed = false,
		deviceActiveStatus = {},
		onSelectLocation = (locationId: number | null) => {},
		onToggleCollapse = () => {},
		onsearch = (value: string) => {},
		onhideEmptyLocationsChange = (value: boolean) => {},
		ondashboardViewTypeChange = (value: string) => {},
		ondashboardSortTypeChange = (value: string) => {}
	} = $props<{
		locations?: any[];
		selectedLocation?: number | null;
		search?: string;
		hideEmptyLocations?: boolean;
		dashboardViewType?: 'grid' | 'list' | string;
		dashboardSortType?: 'name' | 'status' | string;
		collapsed?: boolean;
		deviceActiveStatus?: Record<string, boolean | null>;
		onSelectLocation?: (locationId: number | null) => void;
		onToggleCollapse?: () => void;
		onsearch?: (value: string) => void;
		onhideEmptyLocationsChange?: (value: boolean) => void;
		ondashboardViewTypeChange?: (value: string) => void;
		ondashboardSortTypeChange?: (value: string) => void;
	}>();

	// Local state for search and other filters
	let localSearch = $state(search);
	let localHideEmptyLocations = $state(hideEmptyLocations);
	let localDashboardViewType = $state(dashboardViewType);
	let localDashboardSortType = $state(dashboardSortType);

	// Update local state when props change
	$effect(() => {
		localSearch = search;
	});
	$effect(() => {
		localHideEmptyLocations = hideEmptyLocations;
	});
	$effect(() => {
		localDashboardViewType = dashboardViewType;
	});
	$effect(() => {
		localDashboardSortType = dashboardSortType;
	});

	// Update parent component when local state changes
	$effect(() => {
		//console.log('LocationSidebar: localSearch changed to:', localSearch);
		//console.log('LocationSidebar: search prop is:', search);
		if (localSearch !== search) {
			//console.log('LocationSidebar: Calling onsearch with:', localSearch);
			onsearch(localSearch);
		}
	});
	$effect(() => {
		if (localHideEmptyLocations !== hideEmptyLocations)
			onhideEmptyLocationsChange(localHideEmptyLocations);
	});
	$effect(() => {
		if (localDashboardViewType !== dashboardViewType)
			ondashboardViewTypeChange(localDashboardViewType);
	});
	$effect(() => {
		if (localDashboardSortType !== dashboardSortType)
			ondashboardSortTypeChange(localDashboardSortType);
	});

	// Handle keyboard navigation
	function handleKeyDown(e: KeyboardEvent, location: LocationWithCount) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelectLocation(location.location_id);
		}
	}

	// Clear search function
	function clearSearch() {
		//console.log('LocationSidebar: clearSearch called');
		localSearch = '';
		//console.log('LocationSidebar: localSearch set to empty string');

		// Notify parent component through callback
		onsearch('');
		//console.log('LocationSidebar: onsearch called with empty string');

		// Also directly clear the search in the UI store for redundancy
		const uiStore = getDashboardUIStore();
		uiStore.clearSearch();
		//console.log('LocationSidebar: uiStore.clearSearch called');
	}

	// Function to determine status class and icon for location
	function getLocationStatus(location: LocationWithCount) {
		// If location has no devices, show as inactive (red X)
		if (!location || !location.cw_devices || location.cw_devices.length === 0) {
			return { statusClass: 'status-danger', icon: mdiClose };
		}

		// Check if any devices have null status (loading state)
		const hasNullStatus = location.cw_devices.some(
			(device) => device.dev_eui && deviceActiveStatus[device.dev_eui] === null
		);

		// If any device has null status, show loading
		if (hasNullStatus) {
			return { statusClass: 'status-loading', icon: mdiClockOutline };
		}

		// Convert deviceActiveStatus to a Record<string, boolean> for the utility function
		// This matches how AllDevices.svelte handles it for the dashboard cards
		const activeStatusMap: Record<string, boolean> = {};
		for (const [key, value] of Object.entries(deviceActiveStatus)) {
			activeStatusMap[key] = value === true; // Only true values are considered active
		}

		// Filter active devices using the same logic as the dashboard
		const activeDevices = location.cw_devices.filter(
			(device) => device.dev_eui && activeStatusMap[device.dev_eui] === true
		);

		// Calculate status flags using the same logic as the dashboard
		const allActive =
			location.cw_devices.length > 0 && activeDevices.length === location.cw_devices.length;

		const allInactive = location.cw_devices.length > 0 && activeDevices.length === 0;

		// Return status based on the same conditions as the dashboard
		if (allActive) {
			return { statusClass: 'status-success', icon: mdiCheck };
		} else if (activeDevices.length > 0 && !allInactive) {
			return { statusClass: 'status-warning', icon: mdiAlert };
		} else {
			// This is the case where all devices are inactive
			return { statusClass: 'status-danger', icon: mdiClose };
		}
	}
	// just for testing
</script>

<div
	class="bg-card-light h-fit min-h-screen w-full overflow-hidden rounded-md p-1 shadow-sm transition-[width,padding] duration-300 ease-in-out [&.collapsed]:w-10 [&.collapsed]:max-w-10 [&.collapsed]:min-w-10 [&.collapsed]:overflow-visible [&.collapsed]:px-1"
	class:collapsed
>
	<div class="mb-4 flex items-center">
		<div class="mx-auto flex w-full items-center">
			<button
				class="text-foreground hover:bg-card-hover flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1"
				onclick={onToggleCollapse}
				aria-label={collapsed ? $_('Expand sidebar to search') : $_('Collapse sidebar')}
				title={collapsed ? $_('Expand sidebar to search') : $_('Collapse sidebar')}
			>
				<Icon
					className="h-7 w-7 translate-x-[-4px] {collapsed ? 'rotate-180' : ''}"
					path={mdiChevronLeft}
				/>
			</button>
			{#if !collapsed}
				<div class="ml-2 flex-1">
					<h2>{$_('Locations')}</h2>
				</div>
				<div class="h-[24px]">
					<DashboardFilterBits
						bind:search={localSearch}
						bind:hideNoDeviceLocations={localHideEmptyLocations}
						bind:dashboardViewType={localDashboardViewType}
						bind:dashboardSortType={localDashboardSortType}
					/>
				</div>
			{/if}
		</div>
	</div>
	<div class="mb-1 flex h-10 items-center">
		{#if collapsed}
			<button
				class="text-foreground hover:bg-card-hover flex h-8 w-8 cursor-pointer items-center rounded border-none pl-1"
				onclick={onToggleCollapse}
				title="Expand sidebar to search"
			>
				<Icon path={mdiMagnify} size="1.25em" />
			</button>
		{:else}
			<div class="relative">
				<div
					class="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 transform text-gray-500"
				>
					<svg viewBox="0 0 24 24" width="16" height="16">
						<path fill="currentColor" d={mdiMagnify} />
					</svg>
				</div>
				<input
					type="text"
					bind:value={localSearch}
					class="w-full rounded-md border border-zinc-300 bg-white py-2 pr-9 pl-8 text-sm text-black placeholder-zinc-500 transition-all duration-150 focus:border-blue-500 focus:ring-1 focus:ring-blue-400 focus:outline-none dark:border-zinc-600 dark:bg-zinc-700 dark:text-white dark:placeholder-zinc-400 dark:focus:border-blue-400 dark:focus:ring-blue-500"
					placeholder={$_('Search')}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							browser ? localStorage.setItem('dashboard_search', localSearch) : null;
						}
					}}
				/>
				{#if localSearch}
					<button
						class="absolute top-1/2 right-2 flex h-5 w-5 -translate-y-1/2 transform items-center justify-center rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
						onclick={clearSearch}
						aria-label="Clear search"
					>
						<svg viewBox="0 0 24 24" width="14" height="14">
							<path fill="currentColor" d={mdiClose} />
						</svg>
					</button>
				{/if}
			</div>
		{/if}
	</div>
	<button
		onclick={() => onSelectLocation(null)}
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 100 }}
		role="option"
		aria-selected={selectedLocation === null}
		tabindex="0"
		title={$_('All Locations')}
		class={`my-3 flex h-10 w-full items-center gap-3 rounded text-left transition-all duration-200 ${selectedLocation === null ? 'text-foreground bg-emerald-500/30' : 'hover:bg-card-hover text-white'}`}
	>
		<div class="ml-1.5 flex items-center justify-center">
			<Icon path={mdiEarth} size="1.25em" />
		</div>
		<span
			class={`overflow-hidden font-medium text-ellipsis whitespace-nowrap transition-all duration-200 ${collapsed ? 'pointer-events-none w-0 opacity-0 select-none' : 'w-auto opacity-100'}`}
		>
			{$_('All Locations')}
		</span>
	</button>
	{#if locations.length === 0 && !collapsed}
		<p class="text-foreground p-4">{$_('No locations found.')}</p>
	{:else}
		<ul class="m-0 list-none" role="listbox" aria-label="Select a location">
			{#each locations
				.filter((location: LocationWithCount) => {
					if (hideEmptyLocations) return location.deviceCount > 0;
					return true;
				})
				.filter((location: LocationWithCount) => {
					if (!search?.trim() || collapsed) return true;
					return location.name.toLowerCase().includes(search.toLowerCase());
				}) as location (location.location_id)}
				<li>
					<button
						onclick={() => onSelectLocation(location.location_id)}
						onkeydown={(e) => handleKeyDown(e, location)}
						in:fade={{ duration: 150 }}
						out:fade={{ duration: 100 }}
						role="option"
						aria-selected={selectedLocation === location.location_id}
						tabindex="0"
						title={location.name}
						class={`my-2 flex h-full w-full items-center gap-3 rounded py-2 text-left transition-all duration-200 ${selectedLocation === location.location_id ? 'text-foreground bg-emerald-500/30 font-medium shadow-sm' : 'text-foreground hover:bg-card-hover'}`}
					>
						<div class="ml-1.5 flex items-center justify-center">
							{#if !location.cw_devices || location.cw_devices.length === 0}
								<Icon path={mdiClose} size="1.25em" />
							{:else}
								{@const status = getLocationStatus(location)}
								{#if status.statusClass === 'status-success'}
									<Icon path={mdiCheck} size="1.25em" />
								{:else if status.statusClass === 'status-warning'}
									<Icon path={mdiAlert} size="1.25em" />
								{:else if status.statusClass === 'status-danger'}
									<Icon path={mdiClose} size="1.25em" />
								{:else}
									<Icon path={mdiClockOutline} size="1.25em" />
								{/if}
							{/if}
						</div>
						<div
							class={`overflow-hidden transition-all duration-200 ${collapsed ? 'pointer-events-none w-0 opacity-0 select-none' : 'pointer-events-auto w-auto opacity-100 select-auto'}`}
						>
							<p class="overflow-hidden font-medium text-ellipsis whitespace-nowrap">
								{location.name}
							</p>
							{#if location.description}
								<p
									class="text-foreground-dark mt-1 overflow-hidden text-sm text-ellipsis whitespace-nowrap"
								>
									{location.description}
								</p>
							{/if}
							<p class="text-foreground-dark mt-1 text-xs whitespace-nowrap">
								{location.deviceCount}
								{$_('Devices')}
							</p>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	/* Status colors */
	.status-success {
		background-color: var(--color-success);
	}

	.status-warning {
		background-color: var(--color-warning, #f59e0b);
	}

	.status-danger {
		background-color: var(--color-error, #e53935);
	}

	.status-loading {
		background-color: #64748b; /* blue-gray-500 */
	}
</style>
