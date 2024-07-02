<script lang="ts">
	import { browser } from '$app/environment';
	import { deviceDataStore } from '$lib/stores/deviceData.store';

	if (browser)
		fetch(`/api/v1/devices`)
			.then((res) => res.json())
			.then((data) => deviceDataStore.add(data))
			.catch((err) => {
				console.error(err);
			});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<h1>Devices</h1>
