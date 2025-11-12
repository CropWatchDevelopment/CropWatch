<!--
  LocationsPanel.svelte
  A component that displays a list of locations with selection capability
-->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { handleKeyDown } from '$lib/utilities/dashboardLayout';
	import { getLocationActiveStatus } from '$lib/utilities/deviceUtils';
	import { mdiClose, mdiMagnify } from '$lib/icons/mdi';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import Icon from '$lib/components/ui/base/Icon.svelte';

	type LocationWithCount = {
		location_id: number;
		name: string;
		deviceCount: number;
		cw_devices?: unknown[];
	};

	const dispatch = createEventDispatcher<{
		locationSelect: { locationId: number };
		searchClear: void;
	}>();

	// Props
	export let locations: LocationWithCount[] = [];
	export let selectedLocation: number | null = null;
	export let deviceActiveStatus: Record<string, boolean> = {};
	export let search: string = '';

	// Function to handle location selection
	function selectLocation(locationId: number) {
		dispatch('locationSelect', { locationId });
	}

	// Function to handle location click (for keyboard navigation)
	function handleLocationClick(location: any) {
		if (location && location.location_id) {
			selectLocation(location.location_id);
		}
	}

	// Function to clear search
	function clearSearch() {
		search = '';
		dispatch('searchClear');
	}

	// Filter locations based on search term
	$: filteredLocations = locations.filter(
		(location) => !search || location.name.toLowerCase().includes(search.toLowerCase())
	);

	// Save search term to localStorage when component mounts
	onMount(() => {
		const savedSearch =
			typeof window !== 'undefined' ? localStorage.getItem('dashboard_search') : null;
		if (savedSearch) {
			search = savedSearch;
		}
	});
</script>

<div class="surface-card locations-panel">
	<h2 class="mb-4 text-lg font-semibold">{$_('Locations')}</h2>

	<div class="relative mb-4">
		<div class="absolute inset-y-0 left-0 flex items-center pl-2 text-[var(--color-text-muted)]">
			<Icon path={mdiMagnify} size="1.25em" />
		</div>
		<input
			type="text"
			bind:value={search}
			class="w-full rounded-md border border-[var(--color-border-subtle)] bg-[var(--color-card)] py-2 pr-8 pl-8 text-sm text-[var(--color-text)] placeholder-[var(--color-text-muted)] shadow-sm transition focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] focus:outline-none"
			placeholder={$_('Search')}
			onkeydown={(e) => {
				if (e.key === 'Enter') {
					typeof window !== 'undefined' ? localStorage.setItem('dashboard_search', search) : null;
				}
			}}
		/>
		{#if search}
			<button
				class="absolute inset-y-0 right-0 flex items-center pr-2 text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
				onclick={clearSearch}
				aria-label="Clear search"
			>
				<svg viewBox="0 0 24 24" width="16" height="16">
					<path fill="currentColor" d={mdiClose} />
				</svg>
			</button>
		{/if}
	</div>

	<div class="locations-list" role="listbox">
		{#each filteredLocations as location (location.location_id)}
			<button
				class="location-item"
				class:selected={selectedLocation === location.location_id}
				onclick={() => selectLocation(location.location_id)}
				onkeydown={(e) => handleKeyDown(e, location, handleLocationClick)}
				role="option"
				aria-selected={selectedLocation === location.location_id}
			>
				<div class="location-name">{location.name}</div>
				<div class="location-stats">
					<div class="device-count">
						{location.deviceCount}
						{location.deviceCount === 1 ? 'device' : 'devices'}
					</div>

					{#if location.deviceCount > 0}
						{@const { activeDevices, allActive, allInactive } = getLocationActiveStatus(
							location,
							deviceActiveStatus
						)}
						<div class="status-indicator">
							{#if allActive}
								<span class="status active">All active</span>
							{:else if allInactive}
								<span class="status inactive">All inactive</span>
							{:else}
								<span class="status mixed">
									{activeDevices.length}/{location.deviceCount} active
								</span>
							{/if}
						</div>
					{/if}
				</div>
			</button>
		{/each}
	</div>
</div>

<style>
	.locations-panel {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		height: 100%;
		overflow-y: auto;
	}

	.locations-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.location-item {
		display: flex;
		flex-direction: column;
		padding: 0.85rem;
		border-radius: 0.65rem;
		background-color: var(--color-surface);
		border: 1px solid var(--color-border-subtle);
		text-align: left;
		transition:
			transform 0.2s ease,
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	.location-item:hover {
		background-color: var(--color-surface-emphasis);
		transform: translateY(-1px);
	}

	.location-item.selected {
		border-color: var(--color-primary);
		background-color: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface) 88%);
		color: var(--color-primary);
	}

	.location-name {
		font-weight: 600;
		margin-bottom: 0.35rem;
	}

	.location-stats {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.status {
		font-size: 0.75rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.025em;
	}

	.status.active {
		color: var(--color-primary);
	}

	.status.inactive {
		color: #ef4444;
	}

	.status.mixed {
		color: #f97316;
	}
</style>
