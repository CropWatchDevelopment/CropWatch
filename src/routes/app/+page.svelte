<script lang="ts">
	import { goto } from '$app/navigation';
	import AddLocation from '$lib/components/ui/AddLocation.svelte';
import DashboardCard from '$lib/components/ui/dashboardCard.svelte';
	import bellImage from '$lib/images/UI/cw-bell.svg';
	import filterImage from '$lib/images/UI/cw_filter_button.svg';
	import { mdiPlusCircle, mdiViewDashboard } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import { Button, Icon } from 'svelte-ux';
	export let data;
	const { locations } = data;
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<section>
	<div class="px-4">
		<!-- JSON -->
		<!-- BELL -->
		<div class="py-1 my-5">
			<!-- <div class="flex justify-end w-full h-7">
				<img src={bellImage} alt="" />
			</div> -->
		</div>

		<!-- TITLE and Filter -->
		<div class="flex justify-between mb-6">
			<!-- TITLE -->
			<h2 class=" font-light text-2xl text-surface-100">
				<Icon data={mdiViewDashboard} class="w-6 h-6" />
				{$_('dashboardCard.dashboard')}
			</h2>
			
			<!-- Filter -->
			<div class="flex align-baseline justify-center items-center text-white">
				<Button on:click={() => goto('/app/locations/add')} icon={mdiPlusCircle} size="sm" />
				<!-- <div class="w-3">
					<img src={filterImage} alt="" />
				</div>
				<p class="text-surface-100 px-1">{$_('filter')}</p> -->
			</div>
		</div>
		<!-- CARDS -->
		{#each locations as location}
			<DashboardCard data={location} />
		{/each}
	</div>
</section>
