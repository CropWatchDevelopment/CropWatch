<script lang="ts">
	import Spinner from '$lib/components/Spinner.svelte';
	import AllLocations from '$lib/components/UI/dashboard/AllLocations.svelte';
	import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
	import { onDestroy, onMount } from 'svelte';
	import type { Database } from '../../../../database.types.js';
	import { convertObject } from '$lib/utilities/ConvertSensorDataObject.js';
	import { error, success } from '$lib/stores/toast.svelte.js';

	type cw_device = Database['public']['Tables']['cw_devices']['Row'];
	type cw_locations = Database['public']['Tables']['cw_locations']['Row'] & {
		cw_devices: (cw_device & { cw_device_type: { name: string; data_table_v2: string | null } })[];
	};

	let { data } = $props();
	let locations = $derived(data.locations);
	let supabase: SupabaseClient = data.supabase;
	let realtime: RealtimeChannel | null = null;

	const dataUpdate = (payload: any) => {
		console.log('Data change received!', payload);
		const devEui = payload.dev_eui || null;
		if (devEui == null) return;
		if (locations) {
			const locationIndex: number = locations.findIndex((loc: cw_locations) =>
				loc.cw_devices.some((dev: cw_device) => dev.dev_eui == devEui)
			);
			if (locationIndex === -1) return;
			const deviceIndex: number = locations[locationIndex].cw_devices.findIndex(
				(dev: cw_device) => dev.dev_eui == devEui
			);
			if (deviceIndex === -1) return;
			// Merge the existing latestData with the new payload
			const latestData = {
				...locations[locationIndex].cw_devices[deviceIndex].latestData,
				...payload.new
			};

			const deviceType = locations[locationIndex].cw_devices[deviceIndex].cw_device_type;
			let primaryDataKey = deviceType.primary_data_v2;
			let secondaryDataKey = deviceType.secondary_data_v2;
			let primaryValue = payload?.[primaryDataKey];
			let secondaryValue = payload?.[secondaryDataKey];
			let primaryNotation = deviceType.primary_data_notation || '°C';
			let secondaryNotation = deviceType.secondary_data_notation || '%';

			const convertedSensorData = convertObject(latestData);
			console.log('Converted Sensor Data:', convertedSensorData);
			locations[locationIndex].cw_devices[deviceIndex].latestData = latestData;
			locations[locationIndex].cw_devices[deviceIndex].primaryValue = primaryValue;
			locations[locationIndex].cw_devices[deviceIndex].secondaryValue = secondaryValue;
			locations[locationIndex].cw_devices[deviceIndex].primaryNotation = primaryNotation;
			locations[locationIndex].cw_devices[deviceIndex].secondaryNotation = secondaryNotation;
			locations[locationIndex].cw_devices[deviceIndex].last_data_updated_at = new Date(
				payload.created_at
			);

			locations = [...locations];
		}
	};

	onMount(async () => {
		// subscribe to broadcast events on cw_air_data
		realtime = supabase
			.channel('cw_air_data', { config: { private: true } })
			.on('broadcast', { event: 'INSERT' }, (payload) => dataUpdate(payload.payload.record))
			.on('broadcast', { event: 'UPDATE' }, (payload) => dataUpdate(payload.payload.record))
			.subscribe((status, err) => {
				if (status === 'SUBSCRIBED') {
					console.log('Connected!');
					success('Connected to realtime updates!');
				}
				if (status === 'CHANNEL_ERROR') {
					console.log(`There was an error subscribing to channel: ${err.message}`);
					error(`There was an error subscribing to updates: ${err.message}`);
				}
				if (status === 'TIMED_OUT') {
					console.log('Realtime server did not respond in time.');
					error('Realtime server did not respond in time.');
				}
				if (status === 'CLOSED') {
					console.log('Realtime channel was unexpectedly closed.');
					error('Realtime channel was unexpectedly closed.');
				}
			});
	});

	onDestroy(() => {
		if (realtime) {
			supabase.removeChannel(realtime);
		}
	});
</script>

<svelte:head>
	<title>IoT Dashboard</title>
</svelte:head>

<div class="dashboard-container">
	{#if locations === null}
		<Spinner />
	{:else if locations}
		<AllLocations {supabase} {locations} />
	{:else}
		<p>No locations found.</p>
	{/if}
</div>
