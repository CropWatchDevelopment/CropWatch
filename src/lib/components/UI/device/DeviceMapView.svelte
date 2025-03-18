<script lang="ts">
	import type { IDevice } from '$lib/interfaces/IDevice.interface';
	import DeviceDataList from '../dashboard/DeviceDataList.svelte';
	import Map from '$lib/components/UI/Map.svelte';
	import { Avatar, Card, Header } from 'svelte-ux';
	import { goto } from '$app/navigation';

	let { lat, long, devices }: { lat: number; long: number; devices: IDevice[] } = $props();
	let deviceLocations = $derived(devices.map((device) => [ device.lat || 0, device.long || 0 ]));
</script>

<Map {lat} {long} markers={deviceLocations} locked={true} onPointSelect={(d) => goto(``)} />

<div class="mt-2 flex flex-row gap-2">
	{#each devices as device}
		<Card class={`transition-colors`}>
			<Header title={device.name} subheading="" slot="header">
				<div slot="avatar">
					<Avatar class="bg-primary font-bold text-primary-content">
						<img
							src={`/images/${device.cw_device_type.model}.png`}
							alt={device.name}
							class="w-90 h-90"
						/>
					</Avatar>
				</div>
			</Header>
			<DeviceDataList {device} />
		</Card>
	{/each}
</div>

<style>
	#map {
		width: 100%; /* Adjust map width */
		height: 60vh; /* Adjust map height */
	}
</style>
