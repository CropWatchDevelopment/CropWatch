<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Button } from 'bits-ui';

  export let data;
  const devices = data.devices;
</script>

<svelte:head>
  <title>Devices | CropWatch</title>
</svelte:head>

<div class="flex items-center justify-between my-4">
  <h1 class="text-2xl font-bold">Devices</h1>
  <Button.Root href={`/app/dashboard/location/${$page.params.location_id}/devices/create`}>
    Add Device
  </Button.Root>
</div>

{#if devices?.length}
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {#each devices as device}
      <div class="border rounded-lg p-4 shadow-sm">
        <h2 class="text-lg font-semibold truncate">{device.name}</h2>
        <p class="mt-1 text-sm"><strong>EUI:</strong> {device.dev_eui}</p>
        {#if device.lat != null && device.long != null}
          <p class="text-sm"><strong>Coords:</strong> {device.lat.toFixed(4)}, {device.long.toFixed(4)}</p>
        {/if}
        <div class="mt-4 flex justify-end gap-2">
          <Button.Root variant="secondary" href={`/app/dashboard/location/${$page.params.location_id}/devices/${device.dev_eui}`}>
            View
          </Button.Root>
          <Button.Root variant="ghost" href={`/app/dashboard/location/${$page.params.location_id}/devices/${device.dev_eui}/settings`}>
            Settings
          </Button.Root>
        </div>
      </div>
    {/each}
  </div>
{:else}
  <div class="text-center text-muted mt-8">
    No devices found for this location.
  </div>
{/if}