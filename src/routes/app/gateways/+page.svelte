<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import {
		mdiEye,
		mdiFilter,
		mdiMapMarker,
		mdiRouterWireless,
		mdiRouterWirelessOff
	} from '@mdi/js';
	import { Button, Duration, DurationUnits, Icon, ListItem } from 'svelte-ux';

	let gatewaysPromise;
	let showFilters: boolean = false;

	if (browser) {
		gatewaysPromise = fetch('/api/v1/gateways')
			.then((response) => {
				if (!response.ok) {
					throw new Error('Network response was not ok');
				}
				return response.json();
			})
			.catch((error) => {
				console.error('Fetch error:', error);
				return [];
			});
	} else {
		gatewaysPromise = Promise.resolve([]);
	}
</script>

<svelte:head>
	<title>CropWatch - Gateways</title>
</svelte:head>

<!-- TITLE and Filter -->
<div class="grid-row my-3 grid grid-cols-2 justify-between">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiRouterWireless} class="h-6 w-6" />
		Gateways
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

{#if gatewaysPromise}
	{#if showFilters}
		<div id="filter panel">
			<DarkCard2>
				<h2 class="text-surface">Filters:</h2>
			</DarkCard2>
		</div>
	{/if}
	{#await gatewaysPromise}
		<div class="grid-row my-3 grid grid-cols-2 justify-between">
			<h2 class="text-surface ml-1 mt-4 text-2xl font-light">Loading locations...</h2>
		</div>
	{:then gateways}
		<div>
			{#each gateways as gateway}
				<ListItem
					title={gateway.gateway_name}
					icon={gateway.isOnline ? mdiRouterWireless : mdiRouterWirelessOff}
					classes={{ icon: gateway.isOnline ? 'text-green-500' : 'text-red-500' }}
				>
					<div slot="subheading">
						<p>{`${gateway.isOnline ? '✅ Gateway is UP' : '❌ Gateway is offline'}`}</p>
						<p>
							Last Seen: <Duration
								start={gateway.updated_at}
								totalUnits={2}
								minUnits={DurationUnits.Second}
							/>
						</p>
					</div>
					<div slot="actions">
						<Button
							variant="fill"
							icon={mdiEye}
							on:click={() => goto(`/app/locations/${gateway.gateway_id}`)}
						/>
					</div>
				</ListItem>
			{/each}
		</div>
	{:catch error}
		<div class="grid-row my-3 grid grid-cols-2 justify-between">
			<h2 class="text-surface ml-1 mt-4 text-2xl font-light">Error loading locations</h2>
		</div>
	{/await}
{/if}
