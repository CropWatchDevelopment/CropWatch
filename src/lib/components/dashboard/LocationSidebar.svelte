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

<div class="locations-panel" class:collapsed>
	<div class="sidebar-header">
		<div class="header-content">
			<!-- Toggle button - always visible -->
			<button
				class="toggle-button"
				on:click={onToggleCollapse}
				aria-label="{collapsed ? 'Expand' : 'Collapse'} sidebar"
				title="{collapsed ? 'Expand' : 'Collapse'} sidebar"
			>
				<Icon path={collapsed ? mdiChevronRight : mdiChevronLeft} size="1.25em" />
			</button>

			<!-- Title and filters - only visible when expanded -->
			{#if !collapsed}
				<div class="title-container">
					<h2>Locations</h2>
				</div>

				<div class="filters-container">
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
	<div class="search-container">
		{#if collapsed}
			<!-- Search icon when collapsed - clicking expands the sidebar -->
			<button
				class="search-icon-button"
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
		<p>No locations found.</p>
	{:else}
		<!-- Location list - different display based on collapsed state -->
		<ul class="location-list" role="listbox" aria-label="Select a location">
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
						class="location-item"
						class:selected={selectedLocation === location.location_id}
						class:collapsed
						on:click={() => onSelectLocation(location.location_id)}
						on:keydown={(e) => handleKeyDown(e, location)}
						role="option"
						aria-selected={selectedLocation === location.location_id}
						title={location.name}
					>
						<!-- Icon - always visible -->
						<div class="location-icon">
							<Icon path={mdiHome} size="1.25em" />
						</div>

						<!-- Text content - only visible when expanded -->
						{#if !collapsed}
							<div class="location-content">
								<p class="location-name">{location.name}</p>
								{#if location.description}
									<p class="location-description">{location.description}</p>
								{/if}
								<p class="location-device-count">{location.deviceCount} devices</p>
							</div>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.locations-panel {
		background-color: var(--color-card);
		min-height: calc(100vh - 62px);
		border-radius: 0.25rem;
		padding: 0.25rem;
		height: fit-content;
		box-shadow: var(--shadow-sm);
		transition:
			width 0.3s ease,
			padding 0.3s ease;
		width: 100%;
		overflow: hidden;
	}

	.locations-panel.collapsed {
		width: 40px; /* <-- set your collapsed width here */
		min-width: 40px;
		max-width: 40px;
		padding-left: 0.25rem;
		padding-right: 0.25rem;
		overflow: visible;
	}

	.sidebar-header {
		display: flex;
		align-items: center;
		margin-bottom: 1rem;
		padding: 0.25rem;
	}

	.header-content {
		display: flex;
		align-items: center;
		width: 100%;
	}

	.icon-container {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		color: var(--color-text);
	}

	.title-container {
		flex: 1;
		margin-left: 0.5rem;
	}

	.filters-container {
		margin-left: auto;
	}

	.toggle-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.25rem;
		border-radius: 0.25rem;
		color: var(--color-text);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 0.5rem;
	}

	.toggle-button:hover {
		background-color: var(--color-card-hover);
	}

	.location-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.search-container {
		height: 40px;
		margin-bottom: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.search-icon-button {
		width: 32px;
		height: 32px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
		background: none;
		cursor: pointer;
		color: var(--color-text);
		border-radius: 0.25rem;
	}

	.search-icon-button:hover {
		background-color: var(--color-card-hover);
	}

	.location-item {
		display: flex;
		align-items: center;
		width: 100%;
		text-align: left;
		padding: 0.25rem;
		border: none;
		background: none;
		cursor: pointer;
		border-radius: 0.25rem;
		transition: background-color 0.2s ease;
		color: var(--color-text);
		height: 80px; /* Fixed height for location items */
	}

	.location-item.collapsed {
		justify-content: center;
		padding: 0.25rem 0;
		white-space: nowrap;
		overflow: hidden;
	}

	.location-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		width: 24px;
		height: 24px;
	}

	.location-content {
		flex: 1;
		margin-left: 0.5rem;
		overflow: hidden;
	}

	.location-item:hover {
		background-color: var(--color-card-hover);
	}

	.location-item.selected {
		background-color: var(--color-primary-light);
		color: var(--color-primary-dark);
	}

	.location-name {
		font-weight: 500;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.location-description {
		margin: 0.25rem 0 0;
		font-size: 0.875rem;
		color: var(--color-text-secondary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.location-device-count {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		color: var(--color-text-secondary);
	}

	.hidden {
		display: none;
	}

	h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin-bottom: 0rem;
	}

	.location-list {
		list-style: none;
		padding: 4px;
		margin: 0;
	}

	.location-item {
		padding: 0.5rem;
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
