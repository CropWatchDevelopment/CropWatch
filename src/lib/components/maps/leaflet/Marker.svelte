<script lang="ts">
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { getContext, onDestroy, onMount, setContext } from 'svelte';

	export let width: number;
	export let height: number;
	export let latLng: L.LatLngExpression;
	// export let popupOpen: boolean = false;

	let marker: L.Marker | undefined;
	let markerElement: HTMLDivElement;


	const { getMap }: { getMap: () => L.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		getLayer: () => marker
	});

	onMount(() => {
		if (map) {
			let icon = L.divIcon({
				html: markerElement,
				className: 'map-marker',
				iconSize: L.point(width, height)
			});
			marker = L.marker(latLng, { icon }).addTo(map);
		}
	});

	onDestroy(() => {
		marker?.remove();
		marker = undefined;
	});

	setContext('layer', {
		getLayer: () => marker
	});
</script>

<div bind:this={markerElement}>
	{#if marker}
		<slot />
	{/if}
</div>