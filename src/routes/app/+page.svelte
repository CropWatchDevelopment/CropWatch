<script lang="ts">
	import { goto } from '$app/navigation';
	import DashboardCard from '$lib/components/ui/dashboardCard.svelte';
	import { addOrUpdateDevice, devices } from '$lib/stores/device.store.js';
	import { deviceDataStore } from '$lib/stores/deviceData.store.js';
	import { mdiPlusCircle, mdiViewDashboard } from '@mdi/js';
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';
	import { Button, Icon } from 'svelte-ux';

	export let data;
	const { locations } = data;
	const subscribedTables = new Set();
	const allDevices = [];

	const loadDeviceDataFor = async (dev_eui: string) => {
		if (dev_eui) {
			try {
				const res = await fetch(`/api/v1/devices/${dev_eui}/data?page=0&count=1`);
				try {
					return await res.json();
				} catch (error) {
					console.error('No data for device:', dev_eui, error);
				}
			} catch (err) {
				console.error('Error loading device data:', err);
			}
		}
		return null;
	};

	onMount(async () => {
		for (let location of locations) {
			const response = await fetch(`/api/v1/locations/${location.location_id}/devices`);
			const devicesFromApi = await response.json();
			for (const device of devicesFromApi) {
				addOrUpdateDevice(device);
				const device_to_add = await loadDeviceDataFor(device.dev_eui);
				if (device_to_add) {
					deviceDataStore.updateDevice(device_to_add);
					if (device_to_add.data_table && !subscribedTables.has(device_to_add.data_table)) {
						allDevices.push(device_to_add);
						const channel = data.supabase
							.channel(`realtime:${device_to_add.data_table}`)
							.on(
								'postgres_changes',
								{ event: '*', schema: 'public', table: device_to_add.data_table },
								(payload) => {
									console.log('➡️ Change received!', payload);
									const dev_type = allDevices.find((d) => d.dev_eui == payload.new.dev_eui);
									if (dev_type) {
										payload.new.name = dev_type.name;
										payload.new.primaryData = dev_type.primaryData;
										payload.new.secondaryData = dev_type.secondaryData;
										payload.new.primary_data_notation = dev_type.primary_data_notation;
										payload.new.secondary_data_notation = dev_type.secondary_data_notation;
										payload.new.data_table = dev_type.data_table;
									}
									deviceDataStore.updateDevice(payload.new);
								}
							)
							.subscribe();
						subscribedTables.add(device_to_add.data_table);
						console.log('🔌 Subscribed to channel:', device_to_add.data_table, channel);
					}
				}
			}
		}
	});
</script>

<svelte:head>
	<title>CropWatch UI</title>
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
			<div class="flex align-baseline justify-center items-center">
				<Button on:click={() => goto('/app/locations/add')} variant="text" class="text-white" icon={mdiPlusCircle} size="sm" />
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
