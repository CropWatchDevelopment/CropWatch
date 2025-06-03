<!--
  LocationsPanel.svelte
  A component that displays a list of locations with selection capability
-->
<script lang="ts">
  import type { LocationWithCount } from '$lib/types';
  import { handleKeyDown } from '$lib/utilities/dashboardLayout';
  import { getLocationActiveStatus } from '$lib/utilities/deviceUtils';
  import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
  import { mdiMagnify, mdiClose } from '@mdi/js';
  import { Icon } from 'svelte-ux';
  import { onMount } from 'svelte';

  // Props
  export let locations: LocationWithCount[] = [];
  export let selectedLocation: number | null = null;
  export let deviceActiveStatus: Record<string, boolean> = {};
  export let search: string = '';

  // Function to handle location selection
  function selectLocation(locationId: number) {
    // Emit a custom event to notify parent component
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

  // Filter locations based on search term
  $: filteredLocations = locations.filter(location => 
    !search || location.name.toLowerCase().includes(search.toLowerCase())
  );

  // Save search term to localStorage when component mounts
  onMount(() => {
    const savedSearch = typeof window !== 'undefined' ? localStorage.getItem('dashboard_search') : null;
    if (savedSearch) {
      search = savedSearch;
    }
  });
</script>

<div class="locations-panel">
  <h2 class="text-lg font-semibold mb-4">{nameToJapaneseName('Locations')}</h2>
  
  <div class="relative mb-4">
    <div class="absolute inset-y-0 left-0 flex items-center pl-2 text-gray-500 dark:text-gray-400">
      <Icon path={mdiMagnify} size="1.25em" />
    </div>
    <input
      type="text"
      bind:value={search}
      class="w-full rounded-md border border-zinc-300 bg-white py-2 pr-8 pl-8 text-sm text-black placeholder-zinc-500 transition-all duration-150 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-400 focus:outline-none
      dark:border-zinc-600 dark:bg-zinc-600 dark:text-white dark:placeholder-zinc-400 dark:focus:border-zinc-400 dark:focus:ring-zinc-500"
      placeholder={nameToJapaneseName('Search')}
      onkeydown={(e) => {
        if (e.key === 'Enter') {
          typeof window !== 'undefined' ? localStorage.setItem('dashboard_search', search) : null;
        }
      }}
    />
    {#if search}
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
            {location.deviceCount} {location.deviceCount === 1 ? 'device' : 'devices'}
          </div>
          
          {#if location.deviceCount > 0}
            {@const { activeDevices, allActive, allInactive } = getLocationActiveStatus(location, deviceActiveStatus)}
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
    padding: 0.75rem;
    border-radius: 0.375rem;
    background-color: white;
    border: 1px solid #e5e7eb;
    text-align: left;
    transition: all 0.2s;
  }

  .location-item:hover {
    background-color: #f9fafb;
  }

  .location-item.selected {
    border-color: #3b82f6;
    background-color: #eff6ff;
  }

  :global(.dark) .location-item {
    background-color: #27272a;
    border-color: #3f3f46;
  }

  :global(.dark) .location-item:hover {
    background-color: #3f3f46;
  }

  :global(.dark) .location-item.selected {
    border-color: #3b82f6;
    background-color: #1e3a8a;
  }

  .location-name {
    font-weight: 500;
    margin-bottom: 0.25rem;
  }

  .location-stats {
    display: flex;
    justify-content: space-between;
    font-size: 0.875rem;
    color: #6b7280;
  }

  :global(.dark) .location-stats {
    color: #d1d5db;
  }

  .status {
    font-size: 0.75rem;
    padding: 0.125rem 0.375rem;
    border-radius: 9999px;
  }

  .status.active {
    background-color: #d1fae5;
    color: #065f46;
  }

  .status.inactive {
    background-color: #fee2e2;
    color: #b91c1c;
  }

  .status.mixed {
    background-color: #fef3c7;
    color: #92400e;
  }

  :global(.dark) .status.active {
    background-color: #065f46;
    color: #d1fae5;
  }

  :global(.dark) .status.inactive {
    background-color: #b91c1c;
    color: #fee2e2;
  }

  :global(.dark) .status.mixed {
    background-color: #92400e;
    color: #fef3c7;
  }
</style>
