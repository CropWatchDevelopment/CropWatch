<script lang="ts">
	import { browser } from '$app/environment';
	import { deviceStore } from '$lib/stores/device.store';

	if (browser)
		fetch(`/api/v1/devices`)
			.then((res) => res.json())
			.then((data) => {
				deviceStore.add(data);
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

{#await $deviceStore}
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
