<script lang="ts">
	import DashboardCard from '$lib/components/ui/Cards/Dashboard/DashboardCard.svelte';
	import { onMount } from 'svelte';
	import { mdiFilter, mdiViewDashboard } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { Button, Collapse, Icon, ProgressCircle } from 'svelte-ux';
	import devicesStore, { updateDeviceData } from '$lib/stores/devicesStore';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';

	export let data;
	let { supabase, session } = data;
	$: ({ supabase, session } = data);

	let locations: Tables<'cw_locations'>[] = [];
	let loading: boolean = true;
	let showFilters: boolean = false;
	const subscribedTables = new Set<string>();

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
				.subscribe((status, err) => {
					if (err) {
						console.error('❌ Error subscribing to:', dataTable, err);
					}
					switch (status) {
                        case 'SUBSCRIBED':
                            console.log('🔌 Subscribed to:', dataTable);
                        case 'CHANNEL_ERROR':
                            console.error('❌ Error on channel:', dataTable);
                            break;
                        case 'TIMED_OUT':
                            console.error('❌ Timeout on channel:', dataTable);
                            break;
                        case 'CLOSED':
                        default:
                            break;
                    }
				});
			subscribedTables.add(dataTable);
		});
	}

	async function getDeviceLatestData(devEui: string) {
		const res = await fetch(`/api/v1/devices/${devEui}/latest-data`);
		const data = await res.json();
		return data;
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
		variant="fill"
		color="primary"
		class="mr-1 mt-3 max-w-10 justify-self-end"
		on:click={() => (showFilters = !showFilters)}
	/>
</div>
{#if showFilters}
	<div id="filter panel">
		<DarkCard2>
			<h2 class="text-surface">Filters:</h2>
		</DarkCard2>
	</div>
{/if}
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
