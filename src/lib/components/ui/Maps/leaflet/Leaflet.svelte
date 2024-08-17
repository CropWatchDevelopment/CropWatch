<script lang="ts">
	import { browser } from '$app/environment';
	import 'leaflet/dist/leaflet.css';
	import { onDestroy, onMount, setContext, createEventDispatcher } from 'svelte';
	import type { HeatLayer } from './leafletHeatLayer';

	let L = undefined;

	export let bounds: L.LatLngBoundsExpression | undefined = undefined;
	export let view: L.LatLngExpression | undefined = undefined;
	export let zoom: number | undefined = undefined;
	export let disableZoom: boolean = false;
	export let width: number = 100;
	export let height: number = 100;
	export let heatLatLngData: [number, number, number][] = [];

	let map: L.Map | undefined;
	let heatLayer: any | undefined;
	let mapElement: HTMLDivElement;
	const dispatch = createEventDispatcher();

	onMount(async () => {
		if (browser) {
			// Dynamically import Leaflet
			L = await import('leaflet');
			// await import('leaflet/dist/leaflet.css');
			// Now that Leaflet (L) is defined, import other dependencies
			heatLayer = (await import('./leafletHeatLayer.js')).heatLayer;
			await import('./simpleheat');

			// Initialize the map
			map = L.map(mapElement);

			// Add tile layer
			L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}', {
				maxZoom: 18,
				subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
			}).addTo(map);

			// Update zoom and pan ability
			updateZoomPanAbility();

			// Create and add heat layer
			const heatmap = heatLayer(heatLatLngData, { radius: 25 });
			heatmap.addTo(map);

			// Handle map click events
			map.on('click', function (e: L.LeafletMouseEvent) {
				const { lat, lng } = e.latlng;
				dispatch('mapclick', { latitude: lat, longitude: lng });
			});
		}
	});

	onDestroy(() => {
		map?.remove();
		map = undefined;
	});

	setContext('map', {
		getMap: () => map
	});

	function updateZoomPanAbility() {
		if (map) {
			if (disableZoom) {
				map.dragging.disable();
				map.touchZoom.disable();
				map.doubleClickZoom.disable();
				map.scrollWheelZoom.disable();
				map.boxZoom.disable();
				map.keyboard.disable();
				if (map.tap) map.tap.disable();
			} else {
				map.dragging.enable();
				map.touchZoom.enable();
				map.doubleClickZoom.enable();
				map.scrollWheelZoom.enable();
				map.boxZoom.enable();
				map.keyboard.enable();
				if (map.tap) map.tap.enable();
			}
		}
	}

	$: if (disableZoom !== undefined) {
		updateZoomPanAbility();
	}

	const filterNullPoints = (data) => {
		if (!data) return;
		if (!data.includes(undefined) || data.includes(null)) return;
		return data.map((innerArray) =>
			innerArray.filter((point) => !(point[0] === null && point[1] === null))
		);
	};

	$: if (map) {
		const filteredData = filterNullPoints(bounds);
		if (filteredData && filteredData != undefined) {
			map.fitBounds(bounds);
		} else if (view && !view.includes(null) && zoom) {
			if (view[0] && view[1]) map.setView(view, zoom);
		}
	}
</script>

<div
	class="relative z-40 rounded-xl"
	style={`width: ${width}%; height: ${height}px;`}
	bind:this={mapElement}
>
	{#if map}
		<slot />
	{/if}
</div>
