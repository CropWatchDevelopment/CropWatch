<script lang="ts">
	import { goto } from '$app/navigation';
	import DashboardCard from '$lib/components/ui/dashboardCard.svelte';
	import { deviceStore } from '$lib/stores/device.store.js';
	import { mdiPlusCircle, mdiViewDashboard } from '@mdi/js';
	import type { RealtimeChannel } from '@supabase/supabase-js';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Button, Icon } from 'svelte-ux';

	export let data;
	const { locations } = data;
	const channels: RealtimeChannel[] = [];

	const loadDeviceDataFor = async (device) => {
		if (device) {
			try {
				const res = await fetch(`/api/v1/devices/${device.dev_eui}/data?page=0&count=1`);
				try {
					return await res.json();
				} catch (error) {
					console.error('No data for device:', device.dev_eui, error);
				}
			} catch (err) {
				console.error('Error loading device data:', err);
			}
		}
		return null;
	};

	onMount(async () => {
		for (let location of data.locations) {
			const response = await fetch(`/api/v1/locations/${location.location_id}/devices`);
			const devicesFromApi = await response.json();
			devicesFromApi.forEach(async (device) => {
				const device_to_add = await loadDeviceDataFor(device);
				if (device_to_add) {
					device_to_add.location_id = location.location_id;
					device_to_add.name = device.cw_devices.name;
					deviceStore.add(device_to_add);
					if (
						device_to_add.data_table !== null &&
						device_to_add.data_table !== undefined &&
						channels.find((channel) => channel.topic === `realtime:${device_to_add.data_table}`) ===
							undefined
					) {
						const channel = data.supabase
							.channel(`realtime:${device_to_add.data_table}`)
							.on(
								'postgres_changes',
								{ event: 'INSERT', schema: 'public', table: 'cw_air_thvd' },
								(payload) => {
									console.log('Change received!', payload);
									deviceStore.updateDevice(
										device_to_add.dev_eui,
										payload.new,
										device_to_add.location_id
									);
								}
							)
							.subscribe();
						channels.push(channel);
					}
				}
			});
		}
	});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<section>
	<div class="px-4">
		<!-- TITLE and Filter -->
		<div class="flex justify-between my-3">
			<!-- TITLE -->
			<h2 class="font-light text-2xl text-surface-100">
				<Icon data={mdiViewDashboard} class="w-6 h-6" />
				{$_('dashboardCard.dashboard')}
			</h2>

			<!-- Filter -->
			<div class="flex align-baseline justify-center items-center text-white">
				<Button on:click={() => goto('/app/locations/add')} icon={mdiPlusCircle} size="sm" />
			</div>
		</div>
		<!-- CARDS -->
		<div
			class="grid grid-flow-row grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-3"
		>
			{#each locations as location}
				<DashboardCard data={location} />
			{/each}
		</div>
	</div>
</section>
