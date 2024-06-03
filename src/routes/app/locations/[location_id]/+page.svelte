<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import { Button, Icon, ProgressCircle } from 'svelte-ux';
	import type { Tables } from '../../../../database.types';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import { _ } from 'svelte-i18n';
	import { mdiMoleculeCo2, mdiPlusCircle, mdiWindsock } from '@mdi/js';
	import DarkCard2 from '$lib/components/ui/DarkCard2.svelte';
	import SquareCard from '$lib/components/ui/SquareCard.svelte';
	import { nameToNotation } from '$lib/utilities/nameToNotation';
	import LocationFooterControls from '$lib/components/ui/LocationFooterControls.svelte';
	import { goto } from '$app/navigation';

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

	const getDeviceData = (dev_eui: string) => {
		return fetch(`/api/v1/devices/${dev_eui}/data/latest`, { method: 'GET' }).then((r) => r.json());
	};
</script>

<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative px-4 pb-12">
	<div class="mt-8 flex justify-between">
		<Back previousPage={'/app'} />
	</div>

	{#await location}
		<ProgressCircle />
	{:then loc}
		{#if loc}
			<div class="flex justify-between my-5">
				<h2 class="font-light text-2xl text-surface-100">Add New Device</h2>
				<Button
					on:click={() => goto(`/app/locations/${$page.params.location_id}/devices/add`)}
					icon={mdiPlusCircle}
					size="sm"
				/>
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
			<DarkCard2>
				<Leaflet
					view={[loc.cw_locations?.latitude ?? 0, loc.cw_locations?.longitude ?? 0]}
					zoom={19}
					disableZoom={true}
					width={100}
					height={270}
				>
					<!-- TODO: Load devices on map... -->
					{#await locationDevices then devices}
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
										{:else if deviceType.cw_device_type.data_table === 'seeed_co2_lorawan_uplinks' || deviceType.cw_device_type.data_table === 'cw_co2_uplinks'}
											<Icon data={mdiMoleculeCo2} />
										{/if}
									{/await}
								</a>
							</Marker>
						{/each}
					{/await}
				</Leaflet>
			</DarkCard2>
		{/if}
	{/await}
	<div>
		<h2 class="text-xl text-surface-100">Location Data:</h2>
		<div class="flex flex-wrap justify-center">
			{#await locationDevices then devices}
				{#each devices as device}
					{#await getDeviceData(device.dev_eui)}
						<ProgressCircle />
					{:then dev_data}
						<div class="flex flex-col text-center text-neutral-content text-xl">
							<h2>{device.cw_devices.name}</h2>
							{#if dev_data}
								<div class="flex flex-row flex-wrap justify-center">
									{#each Object.keys(dev_data) as d}
										<SquareCard
											title={$_(d)}
											titleColor={'#4FDE6F'}
											value={dev_data[d]}
											unit={nameToNotation(d)}
											message={'Status coming soon'}
										/>
									{/each}
								</div>
							{:else}
								<p>No data available...</p>
							{/if}
						</div>
					{/await}
				{/each}
			{/await}
		</div>
	</div>
</div>

<LocationFooterControls />
