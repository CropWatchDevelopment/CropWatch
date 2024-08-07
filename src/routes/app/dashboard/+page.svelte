<script lang="ts">
	import DashboardCard from '$lib/components/ui/Cards/Dashboard/DashboardCard.svelte';
	import { onMount } from 'svelte';
	import { mdiFilter, mdiViewDashboard } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { Button, Icon, ProgressCircle } from 'svelte-ux';
	import moment from 'moment';

	export let data;
	let { supabase, session } = data;
	$: ({ supabase, session } = data);

	let locations: Tables<'cw_locations'>[] = [];
	let loading: boolean = true;
	const subscribedTables = new Set<string>();

	// async function fetchHlocData() {
	// 	const { data, error } = await supabase.rpc('get_hloc_data', {
	// 		start_time: '2024-07-01 00:00:00',
	// 		end_time: '2024-08-07 00:00:00',
	// 		time_interval: 'day',
	// 		table_name: 'seeed_co2_lorawan_uplinks',
	// 		device_eui: '2CF7F1C061700099'
	// 	});

	// 	if (error) {
	// 		console.error('Error:', error);
	// 	} else {
	// 		console.log('HLOC Data:', data);
	// 	}
	// }

	
	onMount(() => {
		fetchInitialData();
	});

	async function fetchInitialData() {
		try {
			const res = await fetch('/api/v1/locations?includeDevicesTypes=true');
			const data = await res.json();
			locations = data;
			loading = false;
			await fetchInitialDeviceData();
			setupSubscriptions(locations);
		} catch (e) {
			loading = false;
			console.error('Failed to fetch locations', e);
		}
	}

	async function fetchInitialDeviceData() {
		for (let location of locations) {
			for (let device of location.devices) {
				const latestData = await getDeviceLatestData(device.dev_eui);
				updateDeviceData(latestData);
			}
		}
	}

	function setupSubscriptions(locations) {
		const dataTables = new Set<string>();
		locations.forEach((location: Tables<'cw_locations'>) => {
			location.devices.forEach((device) => {
				dataTables.add(device.deviceType.data_table);
			});
		});

		dataTables.forEach((dataTable: string) => {
			const channel = supabase
				.channel(`realtime:${dataTable}`)
				.on(
					'postgres_changes',
					{ event: '*', schema: 'public', table: dataTable },
					(payload: any) => {
						console.log('📩 Change received!', payload);
						updateDeviceData(payload.new);
					}
				)
				.subscribe();
			subscribedTables.add(dataTable);
			console.log('🔌 Subscribed to:', dataTable);
		});
	}

	async function getDeviceLatestData(devEui: string) {
		const res = await fetch(`/api/v1/devices/${devEui}/latest-data`);
		const data = await res.json();
		return data;
	}

	function updateDeviceData(newData) {
		locations = locations.map((location) => {
			location.devices = location.devices.map((device) => {
				if (device.dev_eui === newData.dev_eui) {
					const isDataOld = moment().diff(moment(newData.created_at), 'minutes') > 120;
					return { ...device, latestData: newData, isDataOld };
				}
				return device;
			});
			return location;
		});
	}
</script>

<svelte:head>
	<title>CropWatch - Dashboard</title>
</svelte:head>

<!-- TITLE and Filter -->
<div class="grid-row my-3 grid grid-cols-2 justify-between">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiViewDashboard} class="h-6 w-6" />
		Dashboard
	</h2>
	<!-- Filter -->
	<Button
		icon={mdiFilter}
		variant="outline"
		color="primary"
		class="mr-1 mt-3 max-w-10 justify-self-end"
	/>
</div>
<!-- CARDS -->
{#if loading}
	<div class="flex h-full items-center justify-center">
		<div class="flex h-32 w-32 flex-col items-center justify-center">
			<ProgressCircle class="justify-center" />
			<p class="mt-2 text-left text-sm">⌛ Loading...</p>
		</div>
	</div>
{:else if locations.length === 0}
	<p>No locations found</p>
{:else}
	<div
		class="mb-3 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
	>
		{#each locations as location}
			<DashboardCard {location} />
		{/each}
	</div>
{/if}
<p>&nbsp;</p>
