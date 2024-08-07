<script lang="ts">
	import { page } from '$app/stores';
	import SensorCard from '$lib/components/ui/Cards/SensorCard.svelte';
	import Leaflet from '$lib/components/ui/Maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/ui/Maps/leaflet/Marker.svelte';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiMapMarker } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Icon } from 'svelte-ux';
	import devicesStore from '$lib/stores/devicesStore';

	let location_id = $page.params.location_id;
	let loading: boolean = true;
	let location: Tables<'cw_locations'>;
	let innerWidth = 0;
	let innerHeight = 200;

	onMount(() => {
		fetchInitialData();
	});

	async function fetchInitialData() {
		try {
			const res = await fetch(`/api/v1/locations/${location_id}?includeDevicesTypes=true`);
			const data = await res.json();
			location = data;
			loading = false;
		} catch (e) {
			loading = false;
			console.error('Failed to fetch locations', e);
		}
	}

	// Subscribe to devicesStore and update the location.devices when data changes
	devicesStore.subscribe((devicesData) => {
		if (location && location.devices) {
			location.devices = location.devices.map((device) => ({
				...device,
				latestData: devicesData[device.dev_eui],
			}));
		}
	});
</script>

<svelte:head>
	<title>CropWatch - Location</title>
</svelte:head>
<svelte:window bind:innerWidth bind:innerHeight />

<!-- TITLE and Filter -->
<div class="grid-row my-3 grid grid-cols-2 justify-between">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiMapMarker} class="h-6 w-6" />
		Location: {location?.name}
	</h2>
</div>

<!-- DEVICE MAP -->
<div class="mx-4 mb-4">
	{#if !loading}
		<Leaflet view={[location.lat, location.long]} zoom={19} height={innerHeight / 3}>
			{#each location.devices as device}
				<Marker latLng={[device.lat, device.long]}>
					<Icon data={mdiMapMarker} class="h-6 w-6 hover:h-8 hover:w-8 hover:-translate-x-1 hover:-translate-y-1 text-primary border-red-500 border-4 rounded-full" />
				</Marker>
			{/each}
		</Leaflet>
	{/if}
</div>

<!-- LOCATION DEVICES -->
<div class="mx-4 grid grid-flow-row grid-cols-1 md:grid-cols-2 gap-2">
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
