<script lang="ts">
	import { onMount } from 'svelte';

	let locations = [];

	onMount(() => {
		fetch('/api/v1/locations?includeDevices=true')
			.then((res) => res.json())
			.then((data) => {
				locations = data;
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

<ul>
	{#each locations as location}
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
</ul>
