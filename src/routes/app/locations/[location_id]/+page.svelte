<script lang="ts">
	import { page } from '$app/stores';
	import SensorCard from '$lib/components/ui/Cards/SensorCard.svelte';
	import Leaflet from '$lib/components/ui/Maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/ui/Maps/leaflet/Marker.svelte';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiCog, mdiMapMarker } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, Icon, Tooltip } from 'svelte-ux';
	import devicesStore, { updateDeviceData } from '$lib/stores/devicesStore';
	import { goto } from '$app/navigation';

	let location_id = $page.params.location_id;
	let loading: boolean = true;
	let location: Tables<'cw_locations'>;
	let innerWidth = 0;
	let innerHeight = 200;
	// let bounds = [];

	onMount(() => {
		fetchInitialData();
	});

	async function fetchInitialData() {
		try {
			const res = await fetch(`/api/v1/locations/${location_id}?includeDevicesTypes=true`);
			const data = await res.json();
			location = data;
			await fetchInitialDeviceData();
			// bounds = location.devices.map(d => [d.latestData.lat, d.latestData.long]);
			loading = false;
		} catch (e) {
			loading = false;
			console.error('Failed to fetch locations', e);
		}
	}

	async function getDeviceLatestData(devEui: string) {
		const res = await fetch(`/api/v1/devices/${devEui}/latest-data`);
		const data = await res.json();
		return data;
	}

	async function fetchInitialDeviceData() {
		for (let device of location.devices) {
			const latestData = await getDeviceLatestData(device.dev_eui);
			updateDeviceData(latestData);
		}
	}

	// Subscribe to devicesStore and update the location.devices when data changes
	devicesStore.subscribe((devicesData) => {
		if (location && location.devices) {
			location.devices = location.devices.map((device) => ({
				...device,
				latestData: devicesData[device.dev_eui]
			}));
		}
	});
</script>

<svelte:head>
	<title>CropWatch - Location</title>
</svelte:head>
<svelte:window bind:innerWidth bind:innerHeight />

<!-- TITLE and Filter -->
<div class="flex flex-row my-3">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiMapMarker} class="h-6 w-6" />
		Location: {location?.name}
	</h2>
	<span class="flex-grow" />
	<Tooltip title={`${location?.name}'s Location Settings`}>
		<Button icon={mdiCog} size="lg" on:click={() => goto(`/app/locations/${location_id}/settings`)} />
	</Tooltip>
</div>

<!-- DEVICE MAP -->
<div class="mx-4 mb-4">
	{#if !loading}
		<Leaflet view={[location.lat, location.long]} zoom={19} height={innerHeight / 3}>
			{#each location.devices as device}
				{#if device.latestData.lat && device.latestData.long}
					<Marker latLng={[device.latestData.lat, device.latestData.long]}>
						<Button
							icon={mdiMapMarker}
							variant="none"
							on:click={() => goto(`/app/devices/${device.dev_eui}/data`)}
							class="h-6 w-6 rounded-full border-4 border-red-600 text-primary hover:border-red-500"
						/>
					</Marker>
				{:else}
					<Marker latLng={[device.lat, device.long]}>
						<Button
							icon={mdiMapMarker}
							variant="none"
							on:click={() => goto(`/app/devices/${device.dev_eui}/data`)}
							class="h-6 w-6 rounded-full border-4 border-red-600 text-primary hover:border-red-500"
						/>
					</Marker>
				{/if}
			{/each}
		</Leaflet>
	{/if}
</div>

<!-- LOCATION DEVICES -->
<div class="mx-4 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2">
	{#if loading}
		<div class="flex items-center justify-center">
			<div class="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
		</div>
	{:else if location.devices.length === 0}
		<div class="flex items-center justify-center">
			<p class="text-surface">No devices found</p>
		</div>
	{:else}
		{#each location.devices as device}
			<SensorCard
				devEui={device.dev_eui}
				name={device.name}
				deviceType={device.deviceType.model}
				latestData={device.latestData}
			/>
		{/each}
	{/if}
</div>

<pre>
	<!-- {JSON.stringify(location.devices, null, 2)} -->
</pre>
