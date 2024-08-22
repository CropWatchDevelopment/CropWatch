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
	let heatLayerInstance: HeatLayer | undefined; // Corrected variable name to avoid conflicts
	let mapElement: HTMLDivElement;
	const dispatch = createEventDispatcher();

	onMount(async () => {
		if (browser) {
			// Dynamically import Leaflet
			L = await import('leaflet');
			const { heatLayer } = await import('./leafletHeatLayer.js');
			await import('./simpleheat');

			// Initialize the map
			map = L.map(mapElement);

			// Add tile layer
			L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}', {
				maxZoom: 20,
				minZoom: 10,
				subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
			}).addTo(map);
			map.setView(view, zoom);

			// Update zoom and pan ability
			updateZoomPanAbility();

			// Create and add heat layer
			heatLayerInstance = heatLayer(heatLatLngData, {
				radius: 40, // Increase radius for better visibility
				blur: 10, // Reduce blur for sharper heat spots
				max: 0.9, // Set the max value for scaling
				maxOpacity: 1.0, // Increase opacity for better visibility
				minOpacity: 0.1, // Ensure low intensity spots are visible
				gradient: {
					0.1: 'blue',
					0.2: 'cyan',
					0.3: 'lime',
					0.5: 'yellow',
					0.7: 'orange',
					0.8: 'red',
				}
			});
			heatLayerInstance.addTo(map);

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

	$: if (map && bounds) {
		const filteredData = filterNullPoints(bounds);
		if (filteredData && filteredData !== undefined) {
			map.fitBounds(bounds);
		} else if (view && !view.includes(null) && zoom) {
			if (view[0] && view[1]) map.setView(view, zoom);
		}
	}

	// Update the heat layer when heatLatLngData changes
	$: if (map && heatLayerInstance && heatLatLngData.length > 0) {
		updateHeatLayer();
	}

	// Function to update the heat layer
	function updateHeatLayer() {
		if (map && heatLayerInstance) {
			// Remove the existing heatmap layer
			heatLayerInstance.setLatLngs(heatLatLngData); // Update heat layer data instead of removing and adding
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
