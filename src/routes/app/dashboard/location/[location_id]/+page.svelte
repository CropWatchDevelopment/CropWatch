<script lang="ts">
  import { goto } from '$app/navigation';
  import { Button } from 'bits-ui';

  export let data;
  const location = data.location!;
  const devices = data.devices ?? [];
  const locationId = data.locationId;
</script>

<svelte:head>
  <title>Location: {location.name} | CropWatch</title>
</svelte:head>

<div class="space-y-8">
  <!-- Location Header -->
  <section class="space-y-2">
    <h1 class="text-2xl font-bold">{location.name}</h1>
    <p class="text-sm text-muted">{location.description}</p>
  </section>

  
  <section class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="h-64 w-full rounded-lg overflow-hidden shadow-md">
		<!-- Do something about this horrible IFRAME later on -->
      <iframe
        class="w-full h-full"
        src={`https://maps.google.com/maps?q=${location.lat},${location.long}&z=${location.map_zoom}&output=embed`}
        frameborder="0"
        allowfullscreen
      ></iframe>
    </div>
    <!-- Details -->
    <div class="bg-card-light dark:bg-card-dark p-6 rounded-lg shadow-md space-y-2">
      <div><span class="font-medium">Location ID:</span> {location.location_id}</div>
      <div><span class="font-medium">Coordinates:</span> {location.lat.toFixed(6)}, {location.long.toFixed(6)}</div>
      <div><span class="font-medium">Zoom Level:</span> {location.map_zoom}</div>
      <div><span class="font-medium">Created:</span> {new Date(location.created_at).toLocaleDateString()}</div>
      <div><span class="font-medium">Owner ID:</span> {location.owner_id}</div>
    </div>
  </section>

  <!-- Action buttons -->
  <section class="flex gap-4">
    <Button.Root href={`/app/dashboard/location/${locationId}/settings`}>
      Location Settings
    </Button.Root>
    <Button.Root href={`/app/dashboard/location/${locationId}/devices/create`}>
      Add Device
    </Button.Root>
  </section>

  <!-- Devices List -->
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Devices</h2>
    {#if devices.length > 0}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each devices as device}
          <div class="border rounded-lg p-4 shadow-sm">
            <h3 class="text-lg font-medium truncate mb-2">{device.name}</h3>
            <p class="text-sm"><strong>EUI:</strong> {device.dev_eui}</p>
            {#if device.lat != null && device.long != null}
              <p class="text-sm"><strong>Coords:</strong> {device.lat.toFixed(4)}, {device.long.toFixed(4)}</p>
            {/if}
            <div class="mt-4 flex justify-end gap-2">
              <Button.Root size="small" variant="secondary" on:click={() => goto(`/app/dashboard/location/${locationId}/devices/${device.dev_eui}`)}>
                View
              </Button.Root>
              <Button.Root size="small" variant="ghost" on:click={() => goto(`/app/dashboard/location/${locationId}/devices/${device.dev_eui}/settings`)}>
                Settings
              </Button.Root>
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-center text-muted">No devices found for this location.</p>
    {/if}
  </section>
</div>