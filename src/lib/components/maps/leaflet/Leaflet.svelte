<script lang="ts">
	import { browser } from '$app/environment';
	import 'leaflet/dist/leaflet.css';
	import { onDestroy, onMount, setContext, createEventDispatcher } from 'svelte';

	let L = undefined;

	export let bounds: L.LatLngBoundsExpression | undefined = undefined;
	export let view: L.LatLngExpression | undefined = undefined;
	export let zoom: number | undefined = undefined;
	export let disableZoom: boolean = false;
	export let width: number = 100;
	export let height: number = 100;

	let map: L.Map | undefined;
	let mapElement: HTMLDivElement;
	const dispatch = createEventDispatcher();

	onMount(async () => {
		if (browser) {
			L = await import('leaflet');
			map = L.map(mapElement);
			L.tileLayer('http://{s}.google.com/vt?lyrs=s,h&x={x}&y={y}&z={z}', {
				maxZoom: 20,
				subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
			}).addTo(map);

			updateZoomPanAbility();

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

	$: if (map) {
		if (bounds) {
			map.fitBounds(bounds);
		} else if (view && zoom) {
			if (view[0] && view[1]) map.setView(view, zoom);
		}
	}
</script>

<div
	class="relative rounded-xl"
	style={`width: ${width}%; height: ${height}px;`}
	bind:this={mapElement}
>
	{#if map}
		<slot />
	{/if}
</div>
