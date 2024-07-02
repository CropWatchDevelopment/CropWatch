<script lang="ts">
	import { browser } from '$app/environment';
	import { deviceDataStore } from '$lib/stores/deviceDataData.store';

	if (browser)
		fetch(`/api/v1/devices`)
			.then((res) => res.json())
			.then((data) => {
				deviceDataStore.add(data);
			})
			.catch((err) => {
				console.error(err);
			});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<h1>Devices</h1>

{#await $deviceDataStore}
	<p>loading...</p>
{:then devices}
	<ul>
		{#each devices as device}
			{#each device as dev}
				<li>
					<a href="/app/devices/{dev.dev_eui}/data">View Data of device: {dev.cw_devices.name}</a>
				</li>
			{/each}
		{/each}
	</ul>
{/await}
