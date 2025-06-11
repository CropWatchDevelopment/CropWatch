<script lang="ts">
	import { browser } from '$app/environment';
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import { onMount } from 'svelte';

	let name = $state('');
	let description = $state('');
	let latitude = $state(0);
	let longitude = $state(0);

	onMount(() => {
		// Initialize any necessary scripts or libraries here if needed
		if (browser && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
                    latitude = pos.coords.latitude;
					longitude = pos.coords.longitude;
				},
				() => {}
			);
		}
	});
</script>

<div>
	<h1>Create Location</h1>

	<form method="post" action="?/createLocation" class="flex flex-col">
		<label for="name">Name:</label>
		<input type="text" id="name" name="name" bind:value={name} required />

		<label for="description">Description:</label>
		<textarea id="description" name="description" bind:value={description}></textarea>

		<label for="latitude">Latitude:</label>
		<input type="text" id="latitude" name="latitude" bind:value={latitude} required />
		<label for="longitude">Longitude:</label>
		<input type="text" id="longitude" name="longitude" bind:value={longitude} required />

		<div class="h-128 w-full overflow-hidden rounded-lg shadow-md">
			{#if browser && latitude !== null && longitude !== null}
				<LeafletMap
					bind:lat={latitude}
					bind:lon={longitude}
					zoom={10}
					markers={[]}
					onclick={(lat: number, lon: number) => {
						latitude = lat;
						longitude = lon;
					}}
					showClickMarker={true}
				/>
			{/if}
		</div>

		<button type="submit">Create Location</button>
	</form>
</div>
