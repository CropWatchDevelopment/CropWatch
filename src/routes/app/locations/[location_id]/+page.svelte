<script lang="ts">
	import { page } from '$app/stores';
	import SensorCard from '$lib/components/ui/Cards/SensorCard.svelte';
	import Leaflet from '$lib/components/ui/Maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/ui/Maps/leaflet/Marker.svelte';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiCog, mdiMapMarker, mdiPlus } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, Icon, Radio, Tooltip } from 'svelte-ux';
	import devicesStore, { updateDeviceData } from '$lib/stores/devicesStore';
	import { goto } from '$app/navigation';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { convertObject } from '$lib/components/ui/utilities/ConvertSensorDataObject';
	import { _ } from 'svelte-i18n';

	let location_id = $page.params.location_id;
	let loading: boolean = true;
	let location: Tables<'cw_locations'>;
	let innerWidth = 0;
	let innerHeight = 200;
	let bounds: [number, number][] = [];
	let heatLatLngData: [number, number, number][] = [];
	let heatMapSubjectKey: string | null = null;
	let latestDataInterestingObjects: string[] = [];

	onMount(() => {
		fetchInitialData();
	});

	async function fetchInitialData() {
		try {
			const res = await fetch(`/api/v1/locations/${location_id}?includeDevicesTypes=true`);
			const data = await res.json();
			debugger;
			location = data;
			await fetchInitialDeviceData();
			if (location.devices) {
				bounds = location.devices.map((d) => {
					if (d.latestData) {
						return [d.latestData.lat, d.latestData.long];
					} else {
						return [d.lat, d.long];
					}
				});
				loading = false;
				updateHeatLatLngData(); // Initial update of heat map data
			} else {
				loading = false;
			}
		} catch (e) {
			loading = false;
			console.error('Failed to fetch locations', e);
		}
	}

	async function getDeviceLatestData(devEui: string) {
		const res = await fetch(`/api/v1/devices/${devEui}/latest-data`);
		if (!res.ok) {
			if (res.status === 404) {
				return [];
			}
			if (res.status === 401) {
				// Unauthorized
				console.error('Unauthorized');
			}
			if (res.status === 403) {
				// Forbidden
				console.error('Forbidden');
			}
			if (res.status === 500) {
				// Internal Server Error
				console.error('Internal Server Error');
			}
		} else {
			const data = await res.json();
			return data;
		}
	}

	async function fetchInitialDeviceData() {
		for (let device of location.devices) {
			const latestData = await getDeviceLatestData(device.dev_eui);
			updateDeviceData(latestData);
			const obj = convertObject(latestData);
			Object.keys(obj).forEach((key) => {
				if (!latestDataInterestingObjects.includes(key)) {
					latestDataInterestingObjects.push(key);
				}
			});
			latestDataInterestingObjects = [
				...latestDataInterestingObjects.filter((key) => key !== 'created_at')
			];
		}
	}

	// Subscribe to devicesStore and update the location.devices when data changes
	devicesStore.subscribe((devicesData) => {
		if (location && location.devices) {
			location.devices = location.devices.map((device) => ({
				...device,
				latestData: devicesData[device.dev_eui]
			}));
			updateHeatLatLngData(); // Recalculate heatLatLngData whenever device data changes
		}
	});

	// Update heatLatLngData based on selected heatMapSubjectKey
	function updateHeatLatLngData() {
		if (!heatMapSubjectKey || !location || !location.devices) return;

		heatLatLngData = location.devices.map((device) => {
			const value = device.latestData[heatMapSubjectKey];
			let normalizedValue = 0;

			// Apply normalization based on the selected key
			if (heatMapSubjectKey === 'temperature') {
				normalizedValue = normalizeTemperature(value);
			} else if (heatMapSubjectKey === 'co2_level') {
				normalizedValue = normalizeCO2(value);
			} else if (heatMapSubjectKey === 'humidity') {
				normalizedValue = normalizeHumidity(value);
			} else if (value !== undefined && value !== null) {
				normalizedValue = Number(value); // Default behavior for other fields
			}
			return [device.lat, device.long, normalizedValue];
		});

		console.log(heatLatLngData);
		return heatLatLngData;
	}

	function normalizeTemperature(temp: number) {
		const minTemp = 0;
		const maxTemp = 50;
		return temp !== undefined && temp !== null ? (temp - minTemp) / (maxTemp - minTemp) : 0;
	}

	function normalizeCO2(co2: number) {
		const minCO2 = 400;
		const maxCO2 = 700;
		return co2 !== undefined && co2 !== null ? (co2 - minCO2) / (maxCO2 - minCO2) : 0;
	}
	function normalizeHumidity(humidity: number) {
		const minHumidity = 0;
		const maxHumidity = 100;
		return humidity !== undefined && humidity !== null
			? (humidity - minHumidity) / (maxHumidity - minHumidity)
			: 0;
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
		{$_('location.name')}: {location?.name}
	</h2>
	<span class="flex-grow" />
	<Tooltip title={`Add Device`} placement="left">
		<Button
			icon={mdiPlus}
			size="lg"
			on:click={() => goto(`/app/locations/${location_id}/devices/add`)}
		/>
	</Tooltip>
	<Tooltip title={`${location?.name}'s Location Settings`} placement="left">
		<Button
			icon={mdiCog}
			size="lg"
			on:click={() => goto(`/app/locations/${location_id}/settings`)}
		/>
	</Tooltip>
</div>

<!-- Render the radio buttons -->
<DarkCard2>
	{#if latestDataInterestingObjects.length > 0}
		<div class="text-surface-500 flex flex-row flex-wrap justify-between">
			{#each latestDataInterestingObjects as key}
				<Radio
					name={key}
					bind:group={heatMapSubjectKey}
					value={key}
					fullWidth
					on:change={updateHeatLatLngData}>{key}</Radio
				>
			{/each}
			<Radio
				name="none"
				bind:group={heatMapSubjectKey}
				value={null}
				fullWidth
				on:change={updateHeatLatLngData}>{$_('location.noFilters')}</Radio
			>
		</div>
	{:else}
		<p>{$_('location.noFilters')}</p>
	{/if}
</DarkCard2>

<!-- DEVICE MAP -->
<div class="mx-4 mb-4">
	{#if !loading && location.lat && location.long}
		<Leaflet
			view={[location.lat, location.long]}
			{bounds}
			disableZoom={true}
			{heatLatLngData}
			zoom={18}
			height={innerHeight / 2.5}
		>
			{#each location.devices as device}
				{#if device.latestData && device.latestData.lat && device.latestData.long}
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
<h1>Location's devices</h1>
<!-- LOCATION DEVICES -->
{#if loading}
	<div class="flex items-center justify-center">
		<div class="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
	</div>
{:else if location.devices && location.devices.length === 0}
	<div class="flex items-center justify-center">
		<p class="text-surface w-full text-center">No devices found</p>
	</div>
{:else}
	<div class="mx-4 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
		{#each location.devices as device}
			<SensorCard
				devEui={device.dev_eui}
				name={device.name}
				deviceType={device.deviceType.model}
				latestData={device.latestData}
			/>
		{/each}
	</div>
{/if}
