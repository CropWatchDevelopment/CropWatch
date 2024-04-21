<script lang="ts">
	import { browser } from '$app/environment';
	import { deviceStore } from '$lib/stores/device.store';
	import { PUBLIC_SITE_BASE } from '$env/static/public';

	if (browser)
		fetch(`${PUBLIC_SITE_BASE}/api/v1/devices`)
			.then((res) => res.json())
			.then((data) => {
				console.log(data);
				deviceStore.add(data);
			})
			.catch((err) => {
				console.log(err);
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
					<pre>{JSON.stringify(dev, null, 2)}</pre>
					<a href="/app/devices/{dev.dev_eui}/data">View Data of device: {dev.cw_devices.name}</a>
				</li>
			{/each}
		{/each}
	</ul>
{/await}
