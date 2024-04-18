<script lang="ts">
	import { browser } from '$app/environment';
	import { PUBLIC_SITE_BASE } from '$env/static/public';
	import { locationStore } from '$lib/stores/location.store';

	let loading: boolean = true;

	if (browser)
		fetch(`${PUBLIC_SITE_BASE}/api/v1/locations`)
			.then((res) => res.json())
			.then((data) => {
				console.log(data);
				locationStore.add(data);
			})
			.catch((err) => {
				console.log(err);
			});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<h1>Locations</h1>

<ul>
	{#each $locationStore as device}
		<li>{JSON.stringify(device, null, 2)}</li>
	{/each}
</ul>
