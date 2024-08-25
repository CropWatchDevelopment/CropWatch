<script lang="ts">
	import DashboardCard from '$lib/components/ui/Cards/Dashboard/DashboardCard.svelte';
	import { onMount } from 'svelte';
	import { mdiFilter, mdiViewDashboard } from '@mdi/js';
	import { Button, Icon, ProgressCircle } from 'svelte-ux';
	import { updateDeviceData } from '$lib/stores/devicesStore';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { _ } from 'svelte-i18n';
	import { locationStore } from '$lib/stores/locationStore';
	import { deviceStore } from '$lib/stores/deviceStore';
	import type { Tables } from '$lib/types/supabaseSchema.js';

	type locationType = Tables<'cw_locations'>;
	type deviceType = Tables<'cw_devices'>;

	export let data;
	let loading: boolean = true;
	let { supabase, session } = data;
	$: ({ supabase, session } = data);

	let showFilters: boolean = false;
	const subscribedTables = new Set<string>();

	onMount(async () => {
		await locationStore.fetchLocations(); // Fetch all locations initially
		loading = false;
		
		$locationStore.forEach((location: locationType) => {
			location.devices.forEach((device: deviceType) => {

				let dataTable: string = device.deviceType.data_table;
				if (!subscribedTables.keys().toArray().includes(dataTable)) {
					const channel = supabase
						.channel(`realtime:${dataTable}`)
						.on(
							'postgres_changes',
							{ event: '*', schema: 'public', table: dataTable },
							(payload: any) => {
								console.log('📩 Change received!', payload);
								updateDeviceData(payload.new);
								deviceStore.updateDevice(payload.new.dev_eui, payload.new);
							}
						)
						.subscribe((status, err) => {
							if (err) {
								// console.error('❌ Error subscribing to:', dataTable, err);
							}
							switch (status) {
								case 'SUBSCRIBED':
									console.log('🔌 Subscribed to:', dataTable);
								case 'CHANNEL_ERROR':
									// console.error('❌ Error on channel:', dataTable);
									break;
								case 'TIMED_OUT':
									// console.error('❌ Timeout on channel:', dataTable);
									break;
								case 'CLOSED':
								default:
									break;
							}
						});
					subscribedTables.add(dataTable);
				}
			});
		});
	});
</script>

<svelte:head>
	<title>CropWatch - Dashboard</title>
</svelte:head>

<!-- TITLE and Filter -->
<div class="grid-row my-3 grid grid-cols-2 justify-between">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiViewDashboard} class="h-6 w-6" />
		{$_('dashboard.dashboard.title')}
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
			<h2 class="text-surface">
				{$_('dashboard.dashboard.filters')}
			</h2>
			<!--PUT FILTERS INPUT BOX HERE-->
		</DarkCard2>
	</div>
{/if}
<!-- CARDS -->
{#if loading}
	<div class="flex h-full items-center justify-center">
		<div class="flex h-32 w-32 flex-col items-center justify-center">
			<ProgressCircle class="justify-center" />
			<p class="mt-2 text-left text-sm">⌛ {$_('app.loading')}</p>
		</div>
	</div>
{:else if $locationStore.length === 0}
	<p>{$_('dashboard.dashboard.noLocationsFound')}</p>
{:else}
	<div
		class="mb-3 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
	>
		</div>
{/if}

<div
	class="mb-3 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
>
	{#each $locationStore as location}
		<DashboardCard {location} />
	{/each}
</div>
<p>&nbsp;</p>
