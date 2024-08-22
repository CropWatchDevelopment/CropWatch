<script lang="ts">
	import { browser } from '$app/environment';
	import 'leaflet/dist/leaflet.css';
	import { getContext, onDestroy, onMount, setContext } from 'svelte';

	export let startlatLng: L.LatLngExpression;
	export let endlatLng: L.LatLngExpression;
	let lineElement: HTMLDivElement;

	let L = undefined;

	let line: L.polyline | undefined;

	const { getMap }: { getMap: () => L.Map | undefined } = getContext('map');
	const map = getMap();

	setContext('layer', {
		getLayer: () => line
	});

	onMount(async () => {
		if (browser) {
			L = await import('leaflet');
			if (map) {
				line = L.polyline([startlatLng, endlatLng]).addTo(map);
			}
		}
	});

	onDestroy(() => {
		line?.remove();
		line = undefined;
	});

	setContext('layer', {
		getLayer: () => line
	});
</script>

<div bind:this={lineElement}>
	{#if line}
		<slot />
	{/if}
</div>