<script lang="ts">
	import { goto } from '$app/navigation';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import { onMount } from 'svelte';
	import { mdiViewDashboard } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { Icon, ProgressCircle } from 'svelte-ux';
	import type { PageData } from './$types';

	export let data;
	let { supabase, session } = data;
	$: ({ supabase, session } = data);

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

<!-- TITLE and Filter -->
<div class="my-3 flex justify-between">
	<!-- TITLE -->
	<h2 class="text-surface mt-3 text-2xl font-light">
		<Icon data={mdiViewDashboard} class="h-6 w-6" />
		Dashboard
	</h2>
	<!-- Filter -->
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
