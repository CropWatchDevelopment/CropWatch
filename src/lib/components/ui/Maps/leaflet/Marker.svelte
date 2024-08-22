<script lang="ts">
	import { browser } from '$app/environment';
	import 'leaflet/dist/leaflet.css';
	import { getContext, onDestroy, onMount, setContext } from 'svelte';

	export let width: number = 10;
	export let height: number = 10;
	export let latLng: L.LatLngExpression;

	let L = undefined;
	let marker: L.Marker | undefined;
	let markerElement: HTMLDivElement;

	const { getMap }: { getMap: () => L.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		getLayer: () => marker
	});

	onMount(async () => {
		if (browser) {
			L = await import('leaflet');
			if (map) {
				let icon = L.divIcon({
					html: markerElement,
					className: 'map-marker',
					iconSize: L.point(width, height)
				});
				marker = L.marker(latLng, { icon }).addTo(map);
			}
		}
	});

	onDestroy(() => {
		marker?.remove();
		marker = undefined;
	});

	// Reactive statement to update marker's position when latLng changes
	$: if (marker && latLng) {
		marker.setLatLng(latLng);
	}

	setContext('layer', {
		getLayer: () => marker
	});
</script>

<div bind:this={markerElement}>
	{#if marker}
		<slot />
	{/if}
</div>
