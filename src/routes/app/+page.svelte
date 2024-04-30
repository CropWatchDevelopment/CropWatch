<script lang="ts">
	import DashboardCard from '$lib/components/ui/dashboardCard.svelte';
	import { Card, Collapse } from 'svelte-ux';
	export let data;
	const { locations } = data;
	import { onMount } from 'svelte';

	onMount(async () => {
		// const response = await fetch('/api/v1/dashboard');
		// const data = await response.json();
		// console.log('loaded data', data);
	});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<!-- <section>
	<div class="bg-surface-100 w-full p-4">
		<h1 class="text-3xl my-8 w-3/4">Get real time data from your crops</h1>
		<h2 class="my-10 text-xl w-3/4">
			Knowing what your crops need is not easy. Making it accessible to you is our job.
		</h2>
	</div>
</section> -->
<section>
	<!-- JSON -->
		<!-- BELL -->
		<div class="py-1 my-5">
			<div class="flex justify-end w-full h-7">
				<img src="/icons/UI/cw-bell.png" alt="" />
			</div>
		</div>

		<!-- TITLE and Filter -->
		<div class="flex justify-between mb-6">
			<!-- TITLE -->
			<h2 class=" font-light text-2xl text-surface-100">Dashboard</h2>

			<!-- Filter -->
			<div class="flex align-baseline justify-center items-center">
				<div class="w-4">
					<img src="/icons/UI/cw_filter_button.png" alt="" />
				</div>
				<p class="text-surface-100 px-1">Filter</p>
			</div>
		</div>
		<!-- CARDS -->
		{#each locations as location}
			<DashboardCard data={location} />
		{/each}
</section>
