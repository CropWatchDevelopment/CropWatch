<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import { Button, Icon, ProgressCircle } from 'svelte-ux';
	import type { Tables } from '../../../../database.types';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import { _ } from 'svelte-i18n';
	import { mdiAccountCircle, mdiMoleculeCo2, mdiPlusCircle, mdiWindsock } from '@mdi/js';
	import DarkCard2 from '$lib/components/ui/DarkCard2.svelte';
	import LocationFooterControls from '$lib/components/ui/LocationFooterControls.svelte';
	import { goto } from '$app/navigation';
	import { devices } from '$lib/stores/device.store.ts';
	import LocationSensorCard from '$lib/components/ui/LocationSensorCard.svelte';

	const location: Promise<Tables<'cw_locations'>> = browser
		? fetch(`/api/v1/locations/${$page.params.location_id}`, { method: 'GET' }).then((r) =>
				r.json()
			)
		: Promise.resolve([]);

	const getDeviceType = (dev_eui: string) => {
		return fetch(`/api/v1/devices/${dev_eui}/type`, { method: 'GET' }).then((r) => r.json());
	};

	let innerWidth = 0;
	let innerHeight = 0;

	let allDevices = [];
	$devices.map((d) => {
		if (d.location_id == +$page.params.location_id) {
			allDevices.push(d);
		}
	});
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative px-4 pb-12">
	<div class="mt-8 flex justify-between">
		<Back previousPage={'/app'} />
	</div>

	{#await location}
		<ProgressCircle />
	{:then loc}
		{#if loc}
			<div class="flex justify-between my-5">
				<h2 class="font-light text-2xl text-surface-100">Location Devices</h2>
				<Button
					on:click={() => goto(`/app/locations/${$page.params.location_id}/devices/add`)}
					icon={mdiPlusCircle}
					size="sm"
				/>
			</div>
			{#await allDevices.map((d) => d.location_id == loc.location_id)}
				<ProgressCircle />
			{:then devices}
				<DarkCard2>
					<Leaflet
						view={[loc.cw_locations?.latitude ?? 0, loc.cw_locations?.longitude ?? 0]}
						zoom={19}
						disableZoom={true}
						width={100}
						height={innerHeight}
					>
						<!-- {#await locationDevices then devices}
							{#each devices as device}
								<Marker
									latLng={[device.cw_devices.lat, device.cw_devices.long]}
									width={50}
									height={50}
								>
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
											{:else if deviceType.cw_device_type.data_table === 'seeed_sensecap_s2120'}
												<Icon data={mdiWindsock} />
											{:else if deviceType.cw_device_type.data_table === 'seeed_t1000'}
												<Icon data={mdiAccountCircle} class="self-center text-white" />
											{:else if deviceType.cw_device_type.data_table === 'seeed_co2_lorawan_uplinks' || deviceType.cw_device_type.data_table === 'cw_co2_uplinks'}
												<Icon data={mdiMoleculeCo2} />
											{/if}
										{/await}
									</a>
								</Marker>
							{/each}
						{/await} -->
					</Leaflet>
				</DarkCard2>

				<div class="grid grid-flow-col grid-cols-1">
					<div class="flex flex-col gap-2 mb-2">
						{#each allDevices as sensor}
							{#await getDeviceType(sensor.cw_devices.dev_eui)}
								<ProgressCircle />
							{:then deviceType}
								<LocationSensorCard {sensor} {deviceType} />
								{JSON.stringify(sensor, null, 2)}
							{/await}
						{/each}
					</div>
				</div>
			{/await}
		{/if}
	{/await}
</div>

<LocationFooterControls />
