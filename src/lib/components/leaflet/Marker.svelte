<script lang="ts">
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { createEventDispatcher, getContext, onDestroy, onMount, setContext } from 'svelte';
	import { Dialog } from 'svelte-ux';

	export let width: number;
	export let height: number;
	export let latLng: L.LatLngExpression;
	// export let popupOpen: boolean = false;

	let marker: L.Marker | undefined;
	let markerElement: HTMLDivElement;

	const dispatch = createEventDispatcher();

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
			// marker.on('click', (e) => {
			// 	popupOpen = !popupOpen;
			// });
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

<div bind:this={markerElement} style="z-index: 1000000;">
	{#if marker}
		<slot />
	{/if}
</div>
