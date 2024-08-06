<script lang="ts">
	import { goto } from '$app/navigation';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import { onMount } from 'svelte';
	import { mdiViewDashboard } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { Icon, ProgressCircle } from 'svelte-ux';

	let locations: Tables<'cw_locations'>[] = [];
	let loading: boolean = true;

	onMount(() => {
		fetch('/api/v1/locations?includeDevicesTypes=true')
			.then((res) => res.json())
			.then((data) => {
				locations = data;
				loading = false;
			})
			.catch((e) => {
				loading = false;
				console.error('Failed to fetch locations', e);
			});
	});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<section>
	<div class="px-4">
		<!-- TITLE and Filter -->
		<div class="my-3 flex justify-between">
			<!-- TITLE -->
			<h2 class="mt-3 text-surface text-2xl font-light">
				<Icon data={mdiViewDashboard} class="h-6 w-6" />
				Dashboard
			</h2>
			<!-- Filter -->
		</div>
		<!-- CARDS -->
		{#if loading}
			<div class="flex h-96 items-center justify-center">
				<div class="flex flex-col justify-center items-center h-32 w-32">
					<ProgressCircle class="justify-center" />
					<p class="text-left text-sm mt-2">⌛ Loading...</p>
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
		<!-- <div
			class="mb-3 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
		>
			{#each locations as location}
				<DashboardCard {location} />
			{/each}
		</div> -->
	</div>
</section>
