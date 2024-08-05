<script lang="ts">
	import DashboardCard from '$lib/components/ui/DashboardCard.svelte';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiViewDashboard } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Icon } from 'svelte-ux';

	let locations: Tables<'cw_locations'>[] = [];

	onMount(() => {
		fetch('/api/v1/locations?includeDevices=true')
			.then((res) => res.json())
			.then((data) => {
				locations = data;
				console.log(locations)
			})
			.catch(console.error);

		// fetch('/api/v1/devices?includeLatestData=true')
		// 	.then((res) => res.json())
		// 	.then((data) => {
		// 		console.log(data);

		// 		debugger;
		// 	})
		// 	.catch(console.error);
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
dashboard

<section>
	<div class="px-4">
		<!-- TITLE and Filter -->
		<div class="my-3 flex justify-between">
			<!-- TITLE -->
			<h2 class="text-2xl font-light text-surface-100">
				<Icon data={mdiViewDashboard} class="h-6 w-6" />
				<!-- {$_('dashboardCard.dashboard')} -->
			</h2>

			<!-- Filter -->
		</div>
		<!-- CARDS -->
		<div
			class="mb-3 grid grid-flow-row grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
		>
			{#each locations as location}
				<DashboardCard data={location}>
					<div slot="data">
						{#each location.devices as device}
							{#await getDeviceLatestData(device.dev_eui)}
								<p>loading...</p>
							{:then latestData}
								abc
							{:catch error}
								<p>error loading data</p>
							{/await}
						{/each}
					</div>
				</DashboardCard>
			{/each}
		</div>
	</div>
</section>

<!-- <ul>
	{#each locations as location}
		<DashboardCard data={[]} />

		<li>
			{location.name}
			<ol class="ml-4">
				{#each location.devices as device}
					<li>{device.name}</li>
					{#await getDeviceLatestData(device.dev_eui)}
						<p>loading...</p>
					{:then latestData}
						<pre>{JSON.stringify(latestData)}</pre>
					{:catch error}
						<p>error loading data</p>
					{/await}
				{/each}
			</ol>
		</li>
	{/each}
</ul> -->
