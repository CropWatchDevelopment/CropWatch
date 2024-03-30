<script lang="ts">
	import {
		mdiChevronRight,
		mdiMapMarker,
		mdiPlus
	} from '@mdi/js';
	import {
		Button,
		ListItem,
		Icon,
		ProgressCircle
	} from 'svelte-ux';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';
	import backgroundImg from '$lib/images/breadcrumb-bg.jpg';

	export let data: PageData;

	let zoom: number | undefined = 20;
</script>

<h1 class="mb-2 flex items-center justify-between text-2xl font-bold border-b w-full text-white relative" style="left:-8px; top:-8px; background-image:url({backgroundImg}); width:100%; height: 100px;">
	<p class="my-auto ml-2">All Locations</p>
	<Button
		icon={mdiPlus}
		variant="fill-light"
		color=""
		class="p-2 text-black/50"
		on:click={() => console.log('Add button clicked')}
	/>
</h1>

<ol>
	{#await data.locations}
		<ProgressCircle />
	{:then locations}
		{#if locations}
			{#each locations as location}
				{#if location && location.cw_locations}
					<ListItem title={location.cw_locations.name}>
						<div slot="avatar">
							<Icon data={mdiMapMarker} />
						</div>
						<div slot="actions">
							<Button
								icon={mdiChevronRight}
								variant="fill-light"
								color="accent"
								class="p-2 text-black/50"
								on:click={() => goto(`locations/${location.cw_locations.location_id}`)}
							/>
						</div>
					</ListItem>
				{:else}
					<li>You don't have any locations yet</li>
				{/if}
			{/each}
		{/if}
	{/await}
</ol>
