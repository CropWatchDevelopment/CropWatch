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

<div class="my-4 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Devices</h1>
	<Button.Root href={`/app/dashboard/location/${$page.params.location_id}/devices/create`}>
		Add Device
	</Button.Root>
</div>

{#await data.devices}
	<div class="text-muted mt-8 text-center">Loading devices...</div>
{:then devices}
	{#if devices?.length}
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each devices as device}
				<div class="rounded-lg border p-4 shadow-sm">
					<h2 class="truncate text-lg font-semibold">{device.name}</h2>
					<p class="mt-1 text-sm"><strong>EUI:</strong> {device.dev_eui}</p>
					{#if device.lat != null && device.long != null}
						<p class="text-sm">
							<strong>Coords:</strong>
							{device.lat.toFixed(4)}, {device.long.toFixed(4)}
						</p>
					{/if}
					<div class="mt-4 flex justify-end gap-2">
						<Button.Root
							variant="secondary"
							href={`/app/dashboard/location/${$page.params.location_id}/devices/${device.dev_eui}`}
						>
							View
						</Button.Root>
						<Button.Root
							variant="ghost"
							href={`/app/dashboard/location/${$page.params.location_id}/devices/${device.dev_eui}/settings`}
						>
							Settings
						</Button.Root>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-muted mt-8 text-center">No devices found for this location.</div>
	{/if}
{/await}
