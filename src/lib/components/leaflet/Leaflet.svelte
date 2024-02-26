<script lang="ts">
	import type { ISensorHeatmapPoint } from '$lib/interfaces/ISensorHeatMapPoints.interface';
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import '$lib/vendor/leaflet-heat';
	import { onDestroy, onMount, setContext } from 'svelte';

	export let bounds: L.LatLngBoundsExpression | undefined = undefined;
	export let view: L.LatLngExpression | undefined = undefined;
	export let zoom: number | undefined = undefined;
	export let disableZoom: boolean = false;
	export let width: number = 100;
	export let height: number = 100;
	export let heatMapLatLngs: IHeatMapPoint[] = [];

	let map: L.Map | undefined;
	let mapElement: HTMLDivElement;

	onMount(async () => {
		map = L.map(mapElement);
		L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}', {
			maxZoom: 20,
			subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
		}).addTo(map);

		//Heatmap layer
		if (heatMapLatLngs && heatMapLatLngs.length > 0) {
			var heat = L.heatLayer(heatMapLatLngs, { radius: 25 }).addTo(map); // [[32.14098326096874, 131.38520548442474, 0.8]]
		}

		if (disableZoom) {
			map.dragging.disable();
			map.touchZoom.disable();
			map.doubleClickZoom.disable();
			map.scrollWheelZoom.disable();
			map.boxZoom.disable();
			map.keyboard.disable();
			if (map.tap) map.tap.disable();
		}
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
	});

	setContext('map', {
		getMap: () => map
	});

	$: if (map) {
		if (bounds) {
			map.fitBounds(bounds);
		} else if (view && zoom) {
			map.setView(view, zoom);
		}
	}
</script>

<div class="relative" style={`width: ${width}px; height: ${height}px;`} bind:this={mapElement}>
	{#if map}
		<slot />
	{/if}
</div>
