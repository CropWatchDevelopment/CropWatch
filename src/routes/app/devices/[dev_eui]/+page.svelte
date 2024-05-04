<script lang="ts">
	import { browser } from '$app/environment';
	import { deviceStore } from '$lib/stores/device.store';

	if (browser)
		fetch(`/api/v1/devices`)
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
