<script lang="ts">
	import { browser } from '$app/environment';
	import {
		mdiViewDashboard,
		mdiMagnify,
		mdiClose,
		mdiChevronLeft,
		mdiChevronRight,
		mdiMapMarker,
		mdiHome
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
		onSelectLocation: (locationId: number) => void;
		onToggleCollapse: () => void;
	}

	// Props
	export let locations: LocationWithCount[] = [];
	export let selectedLocation: number | null = null;
	export let search: string = '';
	export let hideEmptyLocations: boolean = false;
	export let dashboardViewType: string = 'grid';
	export let dashboardSortType: string = 'name';
	export let collapsed: boolean = false;

	// Expose event handlers
	export let onSelectLocation: (locationId: number) => void;
	export let onToggleCollapse: () => void;

	// Handle keyboard navigation
	function handleKeyDown(e: KeyboardEvent, location: LocationWithCount) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelectLocation(location.location_id);
		}
	}

	// Clear search function
	function clearSearch() {
		search = '';
		browser ? localStorage.removeItem('dashboard_search') : null;
	}
</script>

<div
	class="bg-card-light h-fit min-h-[calc(100vh-62px)] w-full overflow-hidden rounded p-1 shadow-sm transition-[width,padding] duration-300 ease-in-out [&.collapsed]:w-10 [&.collapsed]:max-w-10 [&.collapsed]:min-w-10 [&.collapsed]:overflow-visible [&.collapsed]:px-1"
	class:collapsed
>
	<div class="mb-4 flex items-center p-1">
		<div class="mx-auto flex w-full items-center">
			<!-- Toggle button - always visible -->
			<button
				class="text-foreground hover:bg-card-hover flex cursor-pointer items-center justify-center rounded border-none bg-transparent p-1"
				on:click={onToggleCollapse}
				aria-label="{collapsed ? 'Expand' : 'Collapse'} sidebar"
				title="{collapsed ? 'Expand' : 'Collapse'} sidebar"
			>
				<Icon
					class="mx-auto h-6 w-6 translate-x-[-4px] {collapsed ? 'rotate-180' : ''}"
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
						bind:search
						bind:hideNoDeviceLocations={hideEmptyLocations}
						bind:dashboardViewType
						bind:dashboardSortType
					/>
				</div>
			{/if}
		</div>
	</div>
	<!-- Search section - different display based on collapsed state -->
	<div class="mb-2 flex h-10 items-center justify-center">
		{#if collapsed}
			<!-- Search icon when collapsed - clicking expands the sidebar -->
			<button
				class="text-foreground hover:bg-card-hover b flex h-8 w-8 cursor-pointer items-center justify-center rounded border-none"
				on:click={onToggleCollapse}
				title="Expand sidebar to search"
			>
				<Icon path={mdiMagnify} size="1.25em" />
			</button>
		{:else}
			<!-- Full search bar when expanded -->
			<div class="relative px-1">
				<div class="absolute inset-y-0 left-1 flex items-center pl-2">
					<svg viewBox="0 0 24 24" width="16" height="16" class="text-gray-500">
						<path fill="currentColor" d={mdiMagnify} />
					</svg>
				</div>
				<input
					type="text"
					bind:value={search}
					class="w-full rounded-md border border-zinc-300 bg-white py-[5px] pr-8 pl-7 text-sm text-black placeholder-zinc-500 transition-all duration-150 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 focus:outline-none
				dark:border-zinc-600 dark:bg-zinc-600 dark:text-white dark:placeholder-zinc-400 dark:focus:border-zinc-400 dark:focus:ring-zinc-500"
					placeholder={nameToJapaneseName('Search')}
					on:keydown={(e) => {
						if (e.key === 'Enter') {
							browser ? localStorage.setItem('dashboard_search', search) : null;
						}
					}}
				/>
				{#if search}
					<button
						class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
						on:click={clearSearch}
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

	{#if locations.length === 0 && !collapsed}
		<p class="text-foreground p-4">No locations found.</p>
	{:else}
		<!-- Location list - different display based on collapsed state -->
		<ul class="m-0 list-none p-1" role="listbox" aria-label="Select a location">
			{#each locations
				.filter((location) => {
					if (hideEmptyLocations) return location.deviceCount > 0;
					return true;
				})
				.filter((location) => {
					if (!search?.trim() || collapsed) return true;
					return location.name.toLowerCase().includes(search.toLowerCase());
				}) as location (location.location_id)}
				<li>
					<button
						in:fade={{ duration: 150 }}
						out:fade={{ duration: 100 }}
						class="text-foreground hover:bg-card-hover
					[&.selected]:bg-primary-light [&.selected]:text-primary-dark
					flex h-20 w-full cursor-pointer items-center rounded border-none bg-transparent p-2 text-left
					[&.collapsed]:justify-center [&.collapsed]:overflow-hidden [&.collapsed]:px-1 [&.collapsed]:py-0 [&.collapsed]:whitespace-nowrap"
						class:selected={selectedLocation === location.location_id}
						class:collapsed
						on:click={() => onSelectLocation(location.location_id)}
						on:keydown={(e) => handleKeyDown(e, location)}
						role="option"
						aria-selected={selectedLocation === location.location_id}
						title={location.name}
						tabindex="0"
					>
						<!-- Icon: always present, visually centered in both modes -->
						<div class="mx-auto flex h-6 w-6 translate-x-[-5px] items-center justify-center">
							<Icon path={mdiHome} size="1.25em" />
						</div>

						<!-- Text content: fades in/out with sidebar, only visible when expanded -->
						{#if !collapsed}
							<div
								class="ml-2 flex-1 overflow-hidden"
								in:fade={{ duration: 150 }}
								out:fade={{ duration: 10 }}
							>
								<p class="m-0 overflow-hidden font-medium text-ellipsis whitespace-nowrap">
									{location.name}
								</p>
								{#if location.description}
									<p
										class="text-foreground-dark mt-1 overflow-hidden text-sm text-ellipsis whitespace-nowrap"
									>
										{location.description}
									</p>
								{/if}
								<p class="text-foreground-dark mt-1 text-xs">{location.deviceCount} devices</p>
							</div>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	/* Minimal CSS for classes that can't be easily converted to Tailwind */
	:global(.hidden) {
		display: none;
	}
</style>
