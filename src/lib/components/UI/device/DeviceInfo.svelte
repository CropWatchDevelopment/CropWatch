<script lang="ts">
	import { mdiCertificate, mdiDownload } from '@mdi/js';
	import { Button, Tabs, Tooltip } from 'svelte-ux';

	let { device } = $props();

	// Helper function to format dates
	function formatDate(dateStr: string): string {
	  if (!dateStr) return 'N/A';
	  const date = new Date(dateStr);
	  return date.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	  });
	}

</script>
  
  <!-- Card Container -->
  <div class="mt-4 max-w-4xl mx-auto bg-gray-800 rounded-xl shadow-xl p-6 text-gray-100">
	<!-- Header Section -->
	<div class="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4">
	  <h2 class="text-3xl font-bold">{device.name}</h2>
	  <!-- Status badge (you can change the label as needed) -->
	  <span class="mt-2 sm:mt-0 px-3 py-1 bg-green-500 text-white text-sm rounded-full">
		Active
	  </span>
	</div>
  
	<!-- Main Info Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
	  <!-- Device EUI -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Device EUI</p>
		<p class="text-lg font-medium">{device.dev_eui}</p>
	  </div>
  
	  <!-- Serial Number -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Serial Number</p>
		<p class="text-lg font-medium">{device.serial_number ?? 'N/A'}</p>
	  </div>
  
	  <!-- Device Type -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Device Type</p>
		<p class="text-lg font-medium">{device.cw_device_type?.name}</p>
	  </div>
  
	  <!-- Model -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Model</p>
		<p class="text-lg font-medium">{device.cw_device_type?.model}</p>
	  </div>
  
	  <!-- Manufacturer -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Manufacturer</p>
		<p class="text-lg font-medium">{device.cw_device_type?.manufacturer}</p>
	  </div>
  
	  <!-- Installed At -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Installed At</p>
		<p class="text-lg font-medium">{formatDate(device.installed_at)}</p>
	  </div>

	  <!-- Serviced At -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Serviced At</p>
		<p class="text-lg font-medium">{formatDate(device.installed_at)}</p>
	  </div>
  
	  <!-- Data Schema Created At -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Data Schema Created</p>
		<p class="text-lg font-medium">{formatDate(device.cw_device_type?.created_at)}</p>
	  </div>

	  <!-- Warentee Start-End -->
	  <div class="space-y-2">
		<div class="flex flex-row">
			<p class="text-sm text-gray-400 mr-5">Warentee Start - End Date</p>
			<Tooltip
			<Button icon={mdiDownload} variant="fill" class="mb-1" size="sm" />
		</div>
		<p class="text-lg font-medium">{formatDate(device.cw_device_type?.created_at)} - {formatDate(device.cw_device_type?.created_at)}</p>
	  </div>
  
	  <!-- Location Coordinates -->
	  <div class="space-y-2">
		<p class="text-sm text-gray-400">Location (Lat, Long)</p>
		<p class="text-lg font-medium">
		  {device.lat.toFixed(4)}, {device.long.toFixed(4)}
		</p>
	  </div>
  
	  <!-- Additional Statuses -->
	  {#if device.battery_last_changed}
		<div class="space-y-2">
		  <p class="text-sm text-gray-400">Battery Last Changed</p>
		  <p class="text-lg font-medium">{formatDate(device.battery_last_changed)}</p>
		</div>
	  {/if}
  
	  {#if device.warranty_start}
		<div class="space-y-2">
		  <p class="text-sm text-gray-400">Warranty Start</p>
		  <p class="text-lg font-medium">{formatDate(device.warranty_start)}</p>
		</div>
	  {/if}
  
	  {#if device.warranty_end}
		<div class="space-y-2">
		  <p class="text-sm text-gray-400">Warranty End</p>
		  <p class="text-lg font-medium">{formatDate(device.warranty_end)}</p>
		</div>
	  {/if}
	</div>
  
	<!-- Footer Section with IDs or extra details -->
	<div class="mt-6 border-t border-gray-700 pt-4">
	  <p class="text-xs text-gray-500">
		Device Type ID: {device.type} • Location ID: {device.location_id} • User ID: {device.user_id}
	  </p>
	</div>
  </div>
  