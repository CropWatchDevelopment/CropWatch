<script lang="ts">
	import { browser } from '$app/environment';
	import { getDashboardUIStore } from '$lib/stores/DashboardUIStore.svelte';
	import {
		mdiViewDashboard,
		mdiMagnify,
		mdiClose,
		mdiChevronLeft,
		mdiChevronRight,
		mdiMapMarker,
		mdiHome,
		mdiEarth
	} from '@mdi/js';
	import { Icon } from 'svelte-ux';
	import DashboardFilterBits from '$lib/components/UI/dashboard/DashboardFilterBits.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import type { Location } from '$lib/models/Location';
	import type { DeviceWithType } from '$lib/models/Device';
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
		console.log('LocationSidebar: localSearch changed to:', localSearch);
		console.log('LocationSidebar: search prop is:', search);
		if (localSearch !== search) {
			console.log('LocationSidebar: Calling onsearch with:', localSearch);
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
		console.log('LocationSidebar: clearSearch called');
		localSearch = '';
		console.log('LocationSidebar: localSearch set to empty string');

		// Notify parent component through callback
		onsearch('');
		console.log('LocationSidebar: onsearch called with empty string');

		// Also directly clear the search in the UI store for redundancy
		const uiStore = getDashboardUIStore();
		uiStore.clearSearch();
		console.log('LocationSidebar: uiStore.clearSearch called');
	}
</script>

<div
	class="bg-card-light h-fit min-h-[calc(100vh-72px)] w-full overflow-hidden rounded p-1 shadow-sm transition-[width,padding] duration-300 ease-in-out [&.collapsed]:w-10 [&.collapsed]:max-w-10 [&.collapsed]:min-w-10 [&.collapsed]:overflow-visible [&.collapsed]:px-1"
	class:collapsed
>
	<div class="mb-4 flex items-center">
		<div class="mx-auto flex w-full items-center">
			<!-- Toggle button - always visible -->
			<button
				class="text-foreground hover:bg-card-hover flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1"
				onclick={onToggleCollapse}
				aria-label="{collapsed ? 'Expand' : 'Collapse'} sidebar"
				title="{collapsed ? 'Expand' : 'Collapse'} sidebar"
			>
				<Icon
					class="h-7  w-7 translate-x-[-4px] {collapsed ? 'rotate-180' : ''}"
					path={mdiChevronLeft}
				/>
			</button>

			<!-- Title and filters - only visible when expanded -->
			{#if !collapsed}
				<div class="ml-2 flex-1">
					<h2>Locations</h2>
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
	<!-- Search section - different display based on collapsed state -->
	<div class="mb-1 flex h-10 items-center">
		{#if collapsed}
			<!-- Search icon when collapsed - clicking expands the sidebar -->
			<button
				class="text-foreground hover:bg-card-hover flex h-8 w-8 cursor-pointer items-center rounded border-none pl-1"
				onclick={onToggleCollapse}
				title="Expand sidebar to search"
			>
				<Icon path={mdiMagnify} size="1.25em" />
			</button>
		{:else}
			<!-- Full search bar when expanded -->
			<div class="relative">
				<div class="absolute inset-y-0 flex items-center pl-2">
					<svg viewBox="0 0 24 24" width="16" height="16" class=" text-gray-500">
						<path fill="currentColor" d={mdiMagnify} />
					</svg>
				</div>
				<input
					type="text"
					bind:value={localSearch}
					class="w-full rounded-md border border-zinc-300 bg-white py-[5px] pr-14 pl-7 text-sm text-black placeholder-zinc-500 transition-all duration-150 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 focus:outline-none
				dark:border-zinc-600 dark:bg-zinc-600 dark:text-white dark:placeholder-zinc-400 dark:focus:border-zinc-400 dark:focus:ring-zinc-500"
					placeholder={nameToJapaneseName('Search')}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							browser ? localStorage.setItem('dashboard_search', localSearch) : null;
						}
					}}
				/>
				{#if localSearch}
					<button
						class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
						onclick={clearSearch}
						aria-label="Clear search"
					>
						<svg viewBox="0 0 24 24" width="16" height="16">
							<path fill="currentColor" d={mdiClose} />
						</svg>
					</button>
				{/if}
			</div>
		{/if}
	</div>

	<!-- All Locations filter option -->
	<button
		onclick={() => onSelectLocation(null)}
		in:fade={{ duration: 150 }}
		out:fade={{ duration: 100 }}
		role="option"
		aria-selected={selectedLocation === null}
		tabindex="0"
		title="All Locations"
		class={`
		my-3 flex h-10 w-full items-center gap-3 rounded text-left transition-all duration-200
		${selectedLocation === null ? 'text-foreground bg-emerald-500/30' : 'hover:bg-card-hover text-white'}
	`}
	>
		<!-- Icon (always aligned) -->
		<div class="ml-1.5 flex items-center justify-center">
			<Icon path={mdiEarth} size="1.25em" />
		</div>

		<!-- Label -->
		<span
			class={`overflow-hidden font-medium text-ellipsis whitespace-nowrap transition-all duration-200
			${collapsed ? 'pointer-events-none w-0 opacity-0 select-none' : 'w-auto opacity-100'}
		`}
		>
			All Locations
		</span>
	</button>

	{#if locations.length === 0 && !collapsed}
		<p class="text-foreground p-4">No locations found.</p>
	{:else}
		<!-- Location list - different display based on collapsed state -->
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
						class={`
	my-2 flex h-full  w-full items-center gap-3 rounded py-1 py-2 text-left transition-all duration-200
	${
		selectedLocation === location.location_id
			? 'text-foreground bg-emerald-500/30 font-medium shadow-sm'
			: 'text-foreground hover:bg-card-hover'
	}
`}
					>
						<!-- Icon (always aligned) -->
						<div class="ml-1.5 flex items-center justify-center">
							<Icon path={mdiHome} size="1.25em" />
						</div>

						<!-- Label and meta (only when expanded) -->
						<div
							class={`overflow-hidden transition-all duration-200
			${collapsed ? 'pointer-events-none w-0 opacity-0 select-none' : 'pointer-events-auto w-auto opacity-100 select-auto'}
		`}
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
								{location.deviceCount} devices
							</p>
						</div>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
