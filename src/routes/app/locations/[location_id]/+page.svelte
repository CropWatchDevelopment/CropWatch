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
	let bounds: [number, number] | [] = [];
	let heatLatLngData = [
		// [31.699393, 131.124394, 0.8], // [lat, lng, intensity]
		// [31.699393, 131.124394, 0.5],
		// [31.699393, 131.124394, 1.0],
		// [31.699393, 131.124394, 0.7],
		// [31.699185, 131.124394, 0.6]
	];

	onMount(() => {
		fetchInitialData();
	});

	async function fetchInitialData() {
		try {
			const res = await fetch(`/api/v1/locations/${location_id}?includeDevicesTypes=true`);
			const data = await res.json();
			location = data;
			await fetchInitialDeviceData();
			bounds = location.devices.map((d) => [d.latestData.lat, d.latestData.long]);
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
			debugger;
			heatLatLngData = location.devices.map((device) => {
				debugger;
				return [
					device.lat,
					device.long,
					//(device.latestData?.temperature - -40) / 80 - -40 || 0
					// normalizeTemperature(device.latestData?.temperature)
					normalizeCO2(device.latestData?.co2_level)
				];
			});
		}
	});

	function normalizeTemperature(temp) {
		// Normalize temperature with a range of -40 to 80
		const minTemp = -40;
		const maxTemp = 40;

		if (temp === undefined || temp === null) return 0; // Handle missing temperature

		return (temp - minTemp) / (maxTemp - minTemp);
	}
	function normalizeCO2(co2) {
		// Normalize CO2 with a range of 400 to 10,000 ppm
		const minCO2 = 400;
		const maxCO2 = 900;

		if (co2 === undefined || co2 === null) return 0; // Handle missing CO2

		return (co2 - minCO2) / (maxCO2 - minCO2);
	}
</script>

<svelte:head>
	<title>CropWatch - Location</title>
</svelte:head>
<svelte:window bind:innerWidth bind:innerHeight />

<!-- TITLE and Filter -->
<div class="my-3 flex flex-row">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiMapMarker} class="h-6 w-6" />
		Location: {location?.name}
	</h2>
	<span class="flex-grow" />
	<Tooltip title={`${location?.name}'s Location Settings`}>
		<Button
			icon={mdiCog}
			size="lg"
			on:click={() => goto(`/app/locations/${location_id}/settings`)}
		/>
	</Tooltip>
</div>

<!-- DEVICE MAP -->
<div class="mx-4 mb-4">
	{#if !loading && location.lat && location.long}
		<Leaflet
			view={[location.lat, location.long]}
			{bounds}
			{heatLatLngData}
			zoom={20}
			height={innerHeight / 2.5}
		>
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
<div class="mx-4 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-4">
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
