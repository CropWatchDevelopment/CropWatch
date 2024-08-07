<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { mdiArrowRight, mdiMapMarker } from '@mdi/js';
	import { Button, ListItem } from 'svelte-ux';

	let locationsPromise;

	if (browser) {
		locationsPromise = fetch('/api/v1/locations')
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
		locationsPromise = Promise.resolve([]);
	}
</script>

<svelte:head>
	<title>CropWatch - Locations</title>
</svelte:head>

<div class="grid-row my-3 grid grid-cols-2 justify-between">
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">All Locations:</h2>
</div>

{#if locationsPromise}
	{#await locationsPromise}
		<div class="grid-row my-3 grid grid-cols-2 justify-between">
			<h2 class="text-surface ml-1 mt-4 text-2xl font-light">Loading locations...</h2>
		</div>
	{:then locations}
		<div>
			{#each locations as location}
				<ListItem title={location.name} subheading="Subheading" icon={mdiMapMarker}>
					<div slot="actions">
						<Button
							variant="outline"
							icon={mdiArrowRight}
							on:click={() => goto(`/app/locations/${location.location_id}`)}
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
