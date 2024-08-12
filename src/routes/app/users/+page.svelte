<script lang="ts">
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { mdiFilter } from '@mdi/js';
	import { Button } from 'svelte-ux';

	let showFilters: boolean = false;
</script>

<svelte:head>
	<title>CropWatch - All Users</title>
</svelte:head>

<div class="grid-row my-3 grid grid-cols-2 justify-between">
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">All Users:</h2>
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
