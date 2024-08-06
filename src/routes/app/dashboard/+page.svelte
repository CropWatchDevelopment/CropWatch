<script lang="ts">
	import { goto } from '$app/navigation';
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import { onMount } from 'svelte';
	import { mdiViewDashboard } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { Button, Collapse, Icon } from 'svelte-ux';
  
	let locations: Tables<'cw_locations'>[] = [];
  
	onMount(() => {
	  fetch('/api/v1/locations?includeDevicesTypes=true')
		.then((res) => res.json())
		.then((data) => {
		  locations = data;
		  console.log(locations);
		})
		.catch(console.error);
	});
  
	async function getDeviceLatestData(devEui: string) {
	  const res = await fetch(`/api/v1/devices/${devEui}/latest-data`);
	  const data = await res.json();
	  return data;
	}
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
		<h2 class="text-2xl font-light text-surface">
		  <Icon data={mdiViewDashboard} class="h-6 w-6" />
		  Dashboard
		</h2>
		<!-- Filter -->
	  </div>
	  <!-- CARDS -->
	  <div class="mb-3 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
		{#each locations as location}
		  <DashboardCard {location} />
		{/each}
	  </div>
	</div>
  </section>
  