<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import Date from '$lib/components/ui/Date.svelte';
	import NotificationsBell from '$lib/components/ui/NotificationsBell.svelte';
	import { ProgressCircle } from 'svelte-ux';
	import type { Tables } from '../../../../database.types';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';

	const location: Promise<Tables<'cw_locations'>> = browser
		? fetch(`/api/v1/locations/${$page.params.location_id}`, { method: 'GET' }).then((r) =>
				r.json()
			)
		: Promise.resolve([]);

	const locationDevices: Promise<Tables<'cw_devices'>[]> = browser
		? fetch(`/api/v1/locations/${$page.params.location_id}/devices`, { method: 'GET' }).then((r) =>
				r.json()
			)
		: Promise.resolve([]);
</script>

<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative h-screen px-4">
	<Date />
	<div class="mt-8 flex justify-between">
		<Back previousPage={'/app'} />
		<NotificationsBell />
	</div>
	{#await location}
		<ProgressCircle />
	{:then loc}
		{#if loc}
			<div class="flex justify-between mb-6">
				<h2 class="font-light text-2xl text-surface-100">{loc?.cw_locations?.name}</h2>
			</div>

			{#await locationDevices}
				<ProgressCircle />
			{:then devices}
				<!-- <pre>{JSON.stringify(devices, null, 2)}</pre> -->
				{#each devices as device}
					<a href={`/app/devices/${device.dev_eui}/data`} class="text-surface-100"
						>CLICK TO GOTO {device.cw_devices.name}</a
					>
				{/each}
			{/await}

			<Leaflet
				view={[loc.cw_locations.latitude, loc.cw_locations.longitude]}
				zoom={19}
				disableZoom={true}
				width={100}
				height={400}
			>
				<!-- TODO: Load devices on map... -->
				{#await locationDevices then devices}
					{#each devices as device}
						<Marker latLng={[device.cw_devices.lat, device.cw_devices.long]} width={50} height={50}>
							<div class="bg-red-500 w-10 h-10 rounded-full">ICON HERE!</div>
						</Marker>
					{/each}
				{/await}
			</Leaflet>
		{/if}
	{/await}
</div>
