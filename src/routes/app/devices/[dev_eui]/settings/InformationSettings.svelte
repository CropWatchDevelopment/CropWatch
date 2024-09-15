<script lang="ts">
	import { page } from '$app/stores';
	import { dataTableToDeviceImage } from '$lib/components/ui/utilities/dataTableToDeviceImage';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { onMount } from 'svelte';
	import { Card, ProgressCircle } from 'svelte-ux';

	type deviceType = Tables<'cw_devices'>;

	let device: deviceType;

	onMount(async () => {
		const devicePromise = await fetch(
			`/api/v1/devices/${$page.params.dev_eui}?includeDeviceType=true`
		);
		device = await devicePromise.json();
	});
</script>

<h1>Device Information</h1>

<Card>
	{#if device}
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<div>
				<h2>Device Details</h2>
				<p>Device Name: {device.name}</p>
				<p>Device EUI: {device.dev_eui}</p>
                <p>Serial Number: {device.serial_number}</p>
				<p>Device Type: {device.deviceType.name}</p>
				<p>Device Model: {device.deviceType.model}</p>
				<p>Device Manufacturer: {device.deviceType.manufacturer}</p>
				<p>Device Upload Interval: {device.upload_interval}</p>
			</div>
			<div>
				<h2>Device Location</h2>
				<p>Latitude: {device.lat}</p>
				<p>Longitude: {device.long}</p>
			</div>
			<div>
				<h2>Device Ownership status</h2>
				<p>Warentee: {device.warranty_start_date}</p>
				<p>Battery Last Changed: {device.battery_changed_at}</p>
				<p>Device Deployment Date: {device.installed_at}</p>
			</div>
            <div class="flex flex-row justify-center">
                <img src={dataTableToDeviceImage(device.deviceType.data_table)} alt="Device Reference" width="25px" height="25px" />
            </div>
		</div>
	{:else}
		<ProgressCircle />
	{/if}
</Card>
