<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import NotificationsBell from '$lib/components/ui/NotificationsBell.svelte';
	import { Button, Icon, ProgressCircle } from 'svelte-ux';
	import type { Tables } from '../../../../database.types';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import LocationSensorCard from '$lib/components/ui/LocationSensorCard.svelte';
	import { mdiMoleculeCo2 } from '@mdi/js';

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

	const getDeviceType = (dev_eui: string) => {
		return fetch(`/api/v1/devices/${dev_eui}/type`, { method: 'GET' }).then((r) => r.json());
	};
</script>

<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative h-screen px-4">
	<div class="mt-8 flex justify-between">
		<Back previousPage={'/app'} />
		<NotificationsBell />
	</div>
	<!-- Display each sensor brief at current location -->
	<div class="my-6">
		<p class="text-xl text-surface-100">Devices</p>
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
				<!-- <div class="flex flex-col gap-2 mb-2">
					{#each devices as sensor}
						<LocationSensorCard {sensor} />
					{/each}
				</div> -->
			{/await}

			<Leaflet
				view={[loc.cw_locations.latitude, loc.cw_locations.longitude]}
				zoom={20}
				disableZoom={true}
				width={100}
				height={500}
			>
				<!-- TODO: Load devices on map... -->
				{#await locationDevices then devices}
					{#each devices as device}
						<Marker latLng={[device.cw_devices.lat, device.cw_devices.long]} width={50} height={50}>
							<a
								class="bg-black p-2 w-10 text-2xl rounded-full z-20 hover:text-4xl hover:z-30"
								href={`/app/devices/${device.dev_eui}/data`}
							>
								{#await getDeviceType(device.dev_eui)}
									<ProgressCircle />
								{:then deviceType}
									{#if deviceType.cw_device_type.data_table === 'cw_air_thvd'}
										🌡️
									{:else if deviceType.cw_device_type.data_table === 'cw_ss_tme' || deviceType.cw_device_type.data_table === 'cw_ss_tmepnpk'}
										🌱
									{:else if deviceType.cw_device_type.data_table === 'seeed_co2_lorawan_uplinks'}
										<Icon data={mdiMoleculeCo2} />
									{/if}
								{/await}
							</a>
						</Marker>
					{/each}
				{/await}
			</Leaflet>
		{/if}
	{/await}
</div>
