<!-- Locations Dashboard with Custom Grid -->
<script lang="ts">
  import { mdiMapMarker, mdiDevices, mdiEye, mdiCog, mdiPlus, mdiSort, mdiSortAscending, mdiSortDescending, mdiMagnify } from '@mdi/js';
  import { Button, Card, Icon } from 'svelte-ux';
  import type { LocationWithDevices } from './+page.server';
  
  // Svelte 5 props declaration with proper typing
  interface PageData {
    locations: LocationWithDevices[];
  }
  
  let { data }: { data: PageData } = $props();
  
  let locations = $derived(data.locations || [])

  // Custom grid state
  let sortColumn = $state<string | null>(null);
  let sortDirection = $state<'asc' | 'desc'>('asc');
  let searchTerm = $state('');
  
  // Column configuration
  interface Column {
    key: string;
    label: string;
    width: string;
    sortable: boolean;
    align?: 'left' | 'center' | 'right';
  }
  
  const columns: Column[] = [
    { key: 'name', label: '📍 Location Name', width: 'w-64', sortable: true },
    { key: 'description', label: '📝 Description', width: 'w-80', sortable: false },
    { key: 'coordinates', label: '🌍 Coordinates', width: 'w-48', sortable: false },
    { key: 'deviceCount', label: '🔌 Devices', width: 'w-32', sortable: true, align: 'center' },
    { key: 'created_at', label: '📅 Created', width: 'w-36', sortable: true },
    { key: 'actions', label: '⚙️ Actions', width: 'w-32', sortable: false, align: 'center' }
  ];
  
  // Transform and filter location data
  let processedData = $derived(() => {
    let locations = (data?.locations || []).map((location: LocationWithDevices) => ({
      ...location,
      deviceCount: location.cw_devices?.length || 0,
      coordinates: location.lat && location.long ? `${location.lat}, ${location.long}` : null
    }));
    
    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      locations = locations.filter(location => 
        location.name?.toLowerCase().includes(search) ||
        location.description?.toLowerCase().includes(search) ||
        location.coordinates?.toLowerCase().includes(search)
      );
    }
    
    // Apply sorting
    if (sortColumn) {
      locations.sort((a, b) => {
        let aVal = a[sortColumn as keyof typeof a];
        let bVal = b[sortColumn as keyof typeof b];
        
        // Handle null/undefined values
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
        if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
        
        // Handle different data types
        if (sortColumn === 'created_at') {
          aVal = new Date(aVal as string).getTime();
          bVal = new Date(bVal as string).getTime();
        } else if (typeof aVal === 'string' && typeof bVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return locations;
  });
  
  // Sorting function
  function handleSort(columnKey: string) {
    if (!columns.find(col => col.key === columnKey)?.sortable) return;
    
    if (sortColumn === columnKey) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = columnKey;
      sortDirection = 'asc';
    }
  }
  
  // Navigation functions
  function viewLocation(locationId: string) {
    window.location.href = `/app/dashboard/location/${locationId}`;
  }
  
  function editLocation(locationId: string) {
    window.location.href = `/app/dashboard/location/${locationId}/settings`;
  }
</script>

<svelte:head>
  <title>All Locations | CropWatch Dashboard</title>
</svelte:head>

<div class="p-6 space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white">All Locations</h1>
      <p class="text-gray-600 dark:text-gray-400 mt-1">
        Manage and view all your monitoring locations
      </p>
    </div>
    
    <Button
      variant="fill"
      color="primary"
      icon={mdiPlus}
      href="/app/location/create"
      class="px-6 py-2"
    >
      Add Location
    </Button>
  </div>

  <!-- Statistics Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
          <Icon data={mdiMapMarker} class="text-blue-600 dark:text-blue-400" size="1.5em" />
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Total Locations</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">{data?.locations?.length || 0}</p>
        </div>
      </div>
    </Card>
    
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
          <Icon data={mdiDevices} class="text-green-600 dark:text-green-400" size="1.5em" />
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Total Devices</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {(data?.locations || []).reduce((sum: number, loc: LocationWithDevices) => sum + (loc.cw_devices?.length || 0), 0)}
          </p>
        </div>
      </div>
    </Card>
    
    <Card class="p-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <Icon data={mdiMapMarker} class="text-purple-600 dark:text-purple-400" size="1.5em" />
        </div>
        <div>
          <p class="text-sm text-gray-600 dark:text-gray-400">Active Locations</p>
          <p class="text-2xl font-bold text-gray-900 dark:text-white">
            {(locations || []).filter((loc: LocationWithDevices) => (loc.cw_devices?.length || 0) > 0).length}
          </p>
        </div>
      </div>
    </Card>
  </div>

  <!-- Custom Data Grid -->
  <Card class="p-6">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Locations Data Grid</h2>
        <div class="flex items-center gap-4">
          <!-- Search Input -->
          <div class="relative">
            <Icon data={mdiMagnify} class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size="1em" />
            <input
              type="text"
              placeholder="Search locations..."
              bind:value={searchTerm}
              class="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {processedData.length} locations • Click any row to view details
          </div>
        </div>
      </div>
      
      {#if locations.length > 0}
        <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <!-- Table Header -->
          <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div class="flex">
              {#each columns as column}
                <div class="flex items-center px-4 py-3 {column.width} {column.align === 'center' ? 'justify-center' : column.align === 'right' ? 'justify-end' : 'justify-start'}">
                  {#if column.sortable}
                    <button
                      onclick={() => handleSort(column.key)}
                      class="flex items-center gap-2 font-semibold hover:bg-white/10 rounded px-2 py-1 transition-colors"
                    >
                      <span>{column.label}</span>
                      {#if sortColumn === column.key}
                        <Icon 
                          data={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} 
                          size="1em"
                        />
                      {:else}
                        <Icon data={mdiSort} size="1em" class="opacity-50" />
                      {/if}
                    </button>
                  {:else}
                    <span class="font-semibold">{column.label}</span>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
          
          <!-- Table Body -->
          <div class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {#each locations as loc, index}
              <div 
                class="flex hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                onclick={() => viewLocation(loc.location_id)}
                role="button"
                tabindex="0"
                onkeydown={(e) => e.key === 'Enter' && viewLocation(loc.location_id)}
              >
                <!-- Location Name -->
                <div class="flex items-center gap-2 px-4 py-3 w-64">
                  <Icon data={mdiMapMarker} class="text-blue-600 dark:text-blue-400" size="1em" />
                  <span class="font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-800 dark:group-hover:text-blue-300 truncate">
                    {loc.name || 'Unnamed Location'}
                  </span>
                </div>
                
                <!-- Description -->
                <div class="px-4 py-3 w-80">
                  <span class="text-gray-600 dark:text-gray-400 text-sm truncate block">
                    {loc.description || 'No description'}
                  </span>
                </div>
                
                <!-- Coordinates -->
                <div class="px-4 py-3 w-48">
                  {#if loc.lat && loc.long}
                    <div class="text-xs font-mono text-gray-700 dark:text-gray-300">
                      <div>{loc.lat.toFixed(4)}</div>
                      <div>{loc.long.toFixed(4)}</div>
                    </div>
                  {:else}
                    <span class="text-gray-400 text-sm">Not set</span>
                  {/if}
                </div>
                
                <!-- Device Count -->
                <div class="flex items-center justify-center gap-1 px-4 py-3 w-32">
                  <Icon 
                    data={mdiDevices} 
                    class={loc.deviceCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} 
                    size="1em" 
                  />
                  <span class={loc.deviceCount > 0 ? 'font-semibold text-green-600 dark:text-green-400' : 'text-gray-400'}>
                    {loc.deviceCount}
                  </span>
                </div>
                
                <!-- Created Date -->
                <div class="px-4 py-3 w-36">
                  <span class="text-xs text-gray-600 dark:text-gray-400">
                    {new Date(loc.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <!-- Actions -->
                <div class="flex items-center justify-center gap-1 px-4 py-3 w-32">
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      viewLocation(loc.location_id);
                    }}
                    class="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                    title="View Location"
                  >
                    <Icon data={mdiEye} size="1em" />
                  </button>
                  <button
                    onclick={(e) => {
                      e.stopPropagation();
                      editLocation(loc.location_id);
                    }}
                    class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 transition-colors"
                    title="Location Settings"
                  >
                    <Icon data={mdiCog} size="1em" />
                  </button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else if searchTerm.trim()}
        <!-- No search results -->
        <div class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
          <Icon data={mdiMagnify} size="3em" class="mb-4 opacity-50" />
          <h3 class="text-lg font-medium mb-2">No locations found</h3>
          <p class="text-sm text-center mb-4">No locations match your search for "{searchTerm}"</p>
          <Button variant="outline" onclick={() => searchTerm = ''}>
            Clear Search
          </Button>
        </div>
      {:else}
        <!-- No locations at all -->
        <div class="flex flex-col items-center justify-center h-64 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg">
          <Icon data={mdiMapMarker} size="3em" class="mb-4 opacity-50" />
          <h3 class="text-lg font-medium mb-2">No locations found</h3>
          <p class="text-sm text-center mb-4">Get started by creating your first location</p>
          <Button variant="fill" color="primary" icon={mdiPlus} href="/app/location/create">
            Create Location
          </Button>
        </div>
      {/if}
    </div>
  </Card>
</div>

<style>
  /* Custom table styling */
  .table-container {
    scrollbar-width: thin;
    scrollbar-color: rgb(156 163 175) transparent;
  }
  
  .table-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  
  .table-container::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .table-container::-webkit-scrollbar-thumb {
    background-color: rgb(156 163 175);
    border-radius: 3px;
  }
  
  .table-container::-webkit-scrollbar-thumb:hover {
    background-color: rgb(107 114 128);
  }
</style>