<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import {
		mdiArrowRight,
		mdiFilter,
		mdiMapMarker,
		mdiMapMarkerRight
	} from '@mdi/js';
	import { Button, ListItem, Tooltip } from 'svelte-ux';

	let devicesPromise;
	let showFilters: boolean = false;

	if (browser) {
		devicesPromise = fetch('/api/v1/devices')
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
		devicesPromise = Promise.resolve([]);
	}
</script>

<svelte:head>
	<title>CropWatch - All Devices</title>
</svelte:head>

<h1 class="text-surface flex flex-row">
	<span>All Devices:</span>
	<span class="flex-1" />
	<Button
		icon={mdiFilter}
		variant="fill"
		color="primary"
		on:click={() => (showFilters = !showFilters)}
	/>
</h1>

{#if devicesPromise}
	{#if showFilters}
		<div id="filter panel">
			<DarkCard2>
				<h2 class="text-surface">Filters:</h2>
			</DarkCard2>
		</div>
	{/if}
	{#await devicesPromise}
		<div class="grid-row my-3 grid grid-cols-2 justify-between">
			<h2 class="text-surface ml-1 mt-4 text-2xl font-light">Loading devices...</h2>
		</div>
	{:then devices}
		<div>
			{#each devices as device}
				<ListItem title={device.name} subheading={''} icon={mdiMapMarker}>
					<div slot="actions" class="flex gap-2">
						<Tooltip title="View Device Details">
							<Button
								variant="fill"
								icon={mdiArrowRight}
								on:click={() => goto(`/app/devices/${device.dev_eui}/data`)}
							/>
						</Tooltip>
						<Tooltip title="View Device's Location">
							<Button
								variant="fill"
								icon={mdiMapMarkerRight}
								on:click={() => goto(`/app/locations/${device.location_id}`)}
							/>
						</Tooltip>
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
