<script lang="ts">
	import { browser } from '$app/environment';
	import { mdiViewDashboard, mdiMagnify, mdiClose } from '@mdi/js';
	import { Icon } from 'svelte-ux';
	import DashboardFilterBits from '$lib/components/UI/dashboard/DashboardFilterBits.svelte';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import type { Location } from '$lib/models/Location';
	import type { DeviceWithType } from '$lib/models/Device';
	
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

	// Props
	export let locations: LocationWithCount[] = [];
	export let selectedLocation: number | null = null;
	export let search: string = '';
	export let hideEmptyLocations: boolean = false;
	export let dashboardViewType: string = 'grid';
	export let dashboardSortType: string = 'name';

	// Expose event handler for location selection
	export let onSelectLocation: (locationId: number) => void;

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

<div class="locations-panel w-[300px]">
	<h2 class="flex items-center">
		<Icon path={mdiViewDashboard} class="mr-2" />
		Locations
		<div class="ml-auto">
			<DashboardFilterBits
				bind:search
				bind:hideNoDeviceLocations={hideEmptyLocations}
				bind:dashboardViewType
				bind:dashboardSortType
			/>
		</div>
	</h2>
	<div class="pb-6">
		<div class="relative">
			<div class="absolute inset-y-0 left-0 flex items-center pl-2">
				<svg viewBox="0 0 24 24" width="16" height="16" class="text-gray-500">
					<path fill="currentColor" d={mdiMagnify} />
				</svg>
			</div>
			<input
				type="text"
				bind:value={search}
				class="w-full rounded-md border border-zinc-300 bg-white py-2 pr-8 pl-8 text-sm text-black placeholder-zinc-500 transition-all duration-150 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 focus:outline-none
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
	</div>
	{#if locations.length === 0}
		<p>No locations found.</p>
	{:else}
		<ul class="location-list" role="listbox" aria-label="Select a location">
			{#each locations
				.filter((location) => {
					if (hideEmptyLocations) return location.deviceCount > 0;
					return true;
				})
				.filter((location) => {
					if (!search?.trim()) return true;
					return location.name.toLowerCase().includes(search.toLowerCase());
				}) as location (location.location_id)}
				<li>
					<button
						class="location-item"
						class:selected={selectedLocation === location.location_id}
						on:click={() => onSelectLocation(location.location_id)}
						on:keydown={(e) => handleKeyDown(e, location)}
						role="option"
						aria-selected={selectedLocation === location.location_id}
					>
						<p class="location-name">{location.name}</p>
						{#if location.description}
							<p class="location-description">{location.description}</p>
						{/if}
						<p class="location-device-count">{location.deviceCount} devices</p>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.locations-panel {
		background-color: var(--color-card-bg);
		border-radius: 0.5rem;
		padding: 1rem;
		height: fit-content;
		box-shadow: var(--shadow-sm);
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 1rem;
	}

	.location-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.location-item {
		padding: 0.75rem;
		margin-bottom: 0.5rem;
		border-radius: 0.375rem;
		background-color: var(--color-card-hover);
		width: 100%;
		text-align: left;
		transition: background-color 0.2s;
		border: none;
		cursor: pointer;
	}

	.location-item:hover {
		background-color: var(--color-card-active);
	}

	.location-item.selected {
		background-color: var(--color-primary);
		color: white;
	}

	.location-name {
		font-weight: 500;
		margin-bottom: 0.25rem;
	}

	.location-description {
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		margin-bottom: 0.25rem;
	}

	.location-device-count {
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.location-item.selected .location-description,
	.location-item.selected .location-device-count {
		color: rgba(255, 255, 255, 0.8);
	}
</style>
