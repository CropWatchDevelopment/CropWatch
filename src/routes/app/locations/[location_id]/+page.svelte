<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import { Button, Icon, ProgressCircle } from 'svelte-ux';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import { mdiAccountCircle, mdiMoleculeCo2, mdiPlusCircle, mdiSmokeDetectorAlert, mdiThermometer, mdiWindsock } from '@mdi/js';
	import DarkCard2 from '$lib/components/ui/DarkCard2.svelte';
	import LocationFooterControls from '$lib/components/ui/LocationFooterControls.svelte';
	import { goto } from '$app/navigation';
	import { devices } from '$lib/stores/device.store';
	import LocationSensorCard from '$lib/components/ui/LocationSensorCard.svelte';
	import { _ } from 'svelte-i18n';

	let location;
	let allDevices = [];
	let innerWidth = 0;
	let innerHeight = 0;

	if (browser) {
		const fetchLocation = async () => {
			const res = await fetch(`/api/v1/locations/${$page.params.location_id}`);
			location = await res.json();
		};

		const fetchDevices = async () => {
			const devs = [];
			for (const d of $devices) {
				if (d.location_id == +$page.params.location_id) {
					const deviceType = await fetch(`/api/v1/devices/${d.dev_eui}/type`).then((r) => r.json());
					devs.push({ ...d, type: deviceType });
				}
			}
			allDevices = devs;
		};

		fetchLocation();
		fetchDevices();
	}

	const icons = {
		cw_air_thvd: mdiThermometer,
		cw_ss_tme: '🌱',
		cw_ss_tmepnpk: '🌱',
		seeed_sensecap_s2120: mdiWindsock,
		seeed_t1000: '📍',
		seeed_co2_lorawan_uplinks: mdiMoleculeCo2,
		cw_co2_uplinks: mdiMoleculeCo2,
		netvox_ra02a: mdiSmokeDetectorAlert,
	};
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="">
	<div class="mt-8 flex justify-between">
		<Back previousPage={'/app'}>
			{$_('back')}
		</Back>
	</div>

	{#if !location}
		<ProgressCircle />
	{:else}
		<div class="flex justify-between my-5">
			<h2 class="font-light text-2xl text-surface-100">Location Devices</h2>
			<Button
				on:click={() => goto(`/app/locations/${$page.params.location_id}/devices/add`)}
				icon={mdiPlusCircle}
				size="sm"
			/>
		</div>
		<DarkCard2>
			<Leaflet
				view={[location.cw_locations?.lat ?? 0, location.cw_locations?.long ?? 0]}
				zoom={19}
				disableZoom={true}
				width={100}
				height={innerHeight}
			>
				{#each allDevices as device}
					<Marker latLng={[device.cw_devices.lat, device.cw_devices.long]} width={50} height={50}>
						<a
							class="bg-black p-2 w-10 text-2xl rounded-full z-20 hover:text-4xl hover:z-30"
							href={`/app/devices/${device.dev_eui}/data`}
						>
							{#if typeof icons[device.type.cw_device_type.data_table] === 'string'}
								<Icon data={icons[device.type.cw_device_type.data_table]} />
							{/if}
						</a>
					</Marker>
				{/each}
			</Leaflet>
		</DarkCard2>

		<div class="grid grid-flow-col grid-cols-1">
			<div class="flex flex-col gap-2 mb-2">
				{#each allDevices as sensor}
					<LocationSensorCard {sensor} deviceType={sensor.type} />
				{/each}
			</div>
		</div>
	{/if}
</div>

<LocationFooterControls />
