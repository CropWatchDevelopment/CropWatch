<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { mdiArrowRight, mdiFilter, mdiMapMarker } from '@mdi/js';
	import { Button, ListItem } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

	let locationsPromise;
	let showFilters: boolean = false;

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

<h1 class="text-surface flex flex-row">
	<span>{$_('location.all.name')}:</span>
	<span class="flex-1" />
	<Button
		icon={mdiFilter}
		variant="fill"
		color="primary"
		on:click={() => (showFilters = !showFilters)}
	/>
</h1>

{#if locationsPromise}
	{#if showFilters}
		<div id="filter panel">
			<DarkCard2>
				<h2 class="text-surface">Filters:</h2>
			</DarkCard2>
		</div>
	{/if}
	{#await locationsPromise}
		<div class="grid-row my-3 grid grid-cols-2 justify-between">
			<h2 class="text-surface ml-1 mt-4 text-2xl font-light">{$_('app.loading')}</h2>
		</div>
	{:then locations}
		<div>
			{#each locations as location}
				<ListItem title={location.name} subheading="" icon={mdiMapMarker}>
					<div slot="actions">
						<Button
							variant="fill"
							icon={mdiArrowRight}
							on:click={() => goto(`/app/locations/${location.location_id}`)}
						/>
					</div>
				</ListItem>
			{/each}
		</div>
	{:catch error}
		<div class="grid-row my-3 grid grid-cols-2 justify-between">
			<h2 class="text-surface ml-1 mt-4 text-2xl font-light">{$_('location.all.errorLoading')}</h2>
		</div>
	{/await}
{/if}
