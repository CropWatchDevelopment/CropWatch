<!-- Locations Dashboard with RevoGrid -->
<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import type { ColumnRegular } from '@revolist/revogrid';
  import { mdiMapMarker, mdiDevices, mdiEye, mdiCog, mdiPlus } from '@mdi/js';
  import { Button, Card, Icon } from 'svelte-ux';
  import type { LocationWithDevices } from './+page.server';
  
  // Svelte 5 props declaration with proper typing
  interface PageData {
    locations: LocationWithDevices[];
  }
  
  let { data }: { data: PageData } = $props();
  
  // RevoGrid component (dynamically imported)
  let RevoGrid: any = $state(null);
  let gridContainer: HTMLElement | null = $state(null);
  
  // Grid configuration
  let columns: ColumnRegular[] = $state([
    {
      name: '📍 Location Name',
      prop: 'name',
      size: 250,
      sortable: true,
      pin: 'colPinStart',
      cellTemplate: (h, { model }) => {
        return h('div', {
          class: 'flex items-center gap-2 font-semibold text-blue-600 hover:text-blue-800 cursor-pointer',
          onClick: () => window.location.href = `/app/location/${model.location_id}`
        }, [
          h('svg', {
            width: '16',
            height: '16',
            viewBox: '0 0 24 24',
            fill: 'currentColor'
          }, [
            h('path', { d: mdiMapMarker })
          ]),
          h('span', {}, model.name || 'Unnamed Location')
        ]);
      }
    },
    {
      name: '📝 Description',
      prop: 'description',
      size: 300,
      cellTemplate: (h, { model }) => {
        return h('span', {
          class: 'text-gray-600 text-sm'
        }, model.description || 'No description');
      }
    },
    {
      name: '🌍 Coordinates',
      prop: 'coordinates',
      size: 180,
      cellTemplate: (h, { model }) => {
        if (model.lat && model.long) {
          return h('div', {
            class: 'text-xs font-mono'
          }, [
            h('div', {}, `${model.lat.toFixed(4)}`),
            h('div', {}, `${model.long.toFixed(4)}`)
          ]);
        }
        return h('span', { class: 'text-gray-400' }, 'Not set');
      }
    },
    {
      name: '🔌 Devices',
      prop: 'deviceCount',
      size: 100,
      columnType: 'numeric',
      sortable: true,
      cellTemplate: (h, { model }) => {
        const deviceCount = model.cw_devices?.length || 0;
        return h('div', {
          class: 'flex items-center gap-1'
        }, [
          h('svg', {
            width: '14',
            height: '14',
            viewBox: '0 0 24 24',
            fill: 'currentColor',
            class: deviceCount > 0 ? 'text-green-600' : 'text-gray-400'
          }, [
            h('path', { d: mdiDevices })
          ]),
          h('span', {
            class: deviceCount > 0 ? 'font-semibold text-green-600' : 'text-gray-400'
          }, deviceCount.toString())
        ]);
      }
    },
    {
      name: '📅 Created',
      prop: 'created_at',
      size: 120,
      sortable: true,
      cellTemplate: (h, { model }) => {
        const date = new Date(model.created_at);
        return h('span', {
          class: 'text-xs text-gray-600'
        }, date.toLocaleDateString());
      }
    },
    {
      name: '⚙️ Actions',
      prop: 'actions',
      size: 120,
      cellTemplate: (h, { model }) => {
        return h('div', {
          class: 'flex gap-1'
        }, [
          h('button', {
            class: 'p-1 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-colors',
            title: 'View Location',
            onClick: (e: Event) => {
              e.stopPropagation();
              window.location.href = `/app/location/${model.location_id}`;
            }
          }, [
            h('svg', {
              width: '16',
              height: '16',
              viewBox: '0 0 24 24',
              fill: 'currentColor'
            }, [
              h('path', { d: mdiEye })
            ])
          ]),
          h('button', {
            class: 'p-1 rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors',
            title: 'Location Settings',
            onClick: (e: Event) => {
              e.stopPropagation();
              window.location.href = `/app/dashboard/location/${model.location_id}/settings`;
            }
          }, [
            h('svg', {
              width: '16',
              height: '16',
              viewBox: '0 0 24 24',
              fill: 'currentColor'
            }, [
              h('path', { d: mdiCog })
            ])
          ])
        ]);
      }
    }
  ]);

  // Transform location data for the grid
  let gridData = $derived(() => {
    return (data?.locations || []).map((location: LocationWithDevices) => ({
      ...location,
      deviceCount: location.cw_devices?.length || 0,
      coordinates: location.lat && location.long ? `${location.lat}, ${location.long}` : null
    }));
  });

  // Grid theme and configuration
  let theme = $state('default');
  let gridConfig = $state({
    autoSizeColumn: {
      mode: 'autoSizeAll',
      allColumns: true,
      letterBlockSize: 7
    },
    resize: true,
    filter: true,
    exporting: true,
    sorting: {
      multipleColumns: true
    },
    focusTemplate: {
      edit: false,
      range: true
    },
    range: true,
    readonly: true
  });

  // Load RevoGrid dynamically (Svelte 5 onMount)
  onMount(async () => {
    if (browser) {
      try {
        const module = await import('@revolist/svelte-datagrid');
        RevoGrid = module.RevoGrid;
      } catch (error) {
        console.error('Failed to load RevoGrid:', error);
      }
    }
  });

  // Grid event handlers
  function handleRowClick(event: CustomEvent) {
    const locationId = event.detail.model.location_id;
    if (locationId) {
      window.location.href = `/app/location/${locationId}`;
    }
  }

  function handleCellFocus(event: CustomEvent) {
    console.log('Cell focused:', event.detail);
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
            {(data?.locations || []).filter((loc: LocationWithDevices) => (loc.cw_devices?.length || 0) > 0).length}
          </p>
        </div>
      </div>
    </Card>
  </div>

  <!-- RevoGrid -->
  <Card class="p-6">
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Locations Data Grid</h2>
        <div class="text-sm text-gray-500 dark:text-gray-400">
          {gridData.length} locations • Click any row to view details
        </div>
      </div>
      
      <div class="h-96 w-full border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {#if browser && RevoGrid && gridData.length > 0}
          <RevoGrid
            bind:this={gridContainer}
            source={gridData}
            columns={columns}
            theme={theme}
            {...gridConfig}
            on:beforerowrender={handleRowClick}
            on:beforecellfocus={handleCellFocus}
            class="h-full w-full"
          />
        {:else if browser && RevoGrid && gridData.length === 0}
          <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Icon data={mdiMapMarker} size="3em" class="mb-4 opacity-50" />
            <h3 class="text-lg font-medium mb-2">No locations found</h3>
            <p class="text-sm text-center mb-4">Get started by creating your first location</p>
            <Button variant="fill" color="primary" icon={mdiPlus} href="/app/location/create">
              Create Location
            </Button>
          </div>
        {:else}
          <div class="flex items-center justify-center h-full">
            <div class="text-center text-gray-500 dark:text-gray-400">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading data grid...</p>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </Card>
</div>

<pre>{JSON.stringify(data, null, 2)}</pre>

<style>
  /* Custom RevoGrid styling */
  :global(.revogrid-container) {
    border-radius: 0.5rem;
  }
  
  :global(.revogrid-header) {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
  }
  
  :global(.revogrid-row:hover) {
    background-color: rgba(59, 130, 246, 0.05);
    cursor: pointer;
  }
  
  :global(.revogrid-cell) {
    border-right: 1px solid #e5e7eb;
  }
  
  :global(.dark .revogrid-cell) {
    border-right-color: #374151;
  }
  
  :global(.revogrid-focus) {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
  }
</style>