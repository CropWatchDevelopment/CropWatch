<script lang="ts">
	import DashboardCard from '$lib/components/ui/dashboardCard.svelte';
	import bellImage from '$lib/images/UI/cw-bell.svg';
	import filterImage from '$lib/images/UI/cw_filter_button.svg';
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

<section>
	<!-- JSON -->
		<!-- BELL -->
		<div class="py-1 my-5">
			<div class="flex justify-end w-full h-7">
				<img src={bellImage} alt="" />
			</div>
		</div>

		<!-- TITLE and Filter -->
		<div class="flex justify-between mb-6">
			<!-- TITLE -->
			<h2 class=" font-light text-2xl text-surface-100">Dashboard</h2>

			<!-- Filter -->
			<div class="flex align-baseline justify-center items-center">
				<div class="w-4">
					<img src={filterImage} alt="" />
				</div>
				<p class="text-surface-100 px-1">Filter</p>
			</div>
		</div>
		<!-- CARDS -->
		{#each locations as location}
			<DashboardCard data={location} />
		{/each}
</section>
