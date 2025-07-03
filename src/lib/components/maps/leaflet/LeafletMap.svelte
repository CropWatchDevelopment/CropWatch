<script lang="ts">
	import {
		Control,
		DivIcon,
		LayerGroup,
		Map,
		Marker,
		Polyline,
		TileLayer,
		type LeafletMouseEvent
	} from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import { mount, unmount } from 'svelte';
	import MapToolbar from './MapToolbar.svelte';
	import MarkerPopup from './MarkerPopup.svelte';
	import * as markerIcons from './markers.js';

	interface Props {
		data?: any;
		lat: number;
		lon: number;
		zoom?: number;
		markers: [number, number][];
		onclick?: (lat: number, lon: number, event: LeafletMouseEvent) => void;
		showClickMarker?: boolean;
	}

	let {
		data,
		lat = $bindable(),
		lon = $bindable(),
		zoom = $bindable(10),
		markers = $bindable(),
		onclick,
		showClickMarker = false
	}: Props = $props();

	let map = $state<Map | undefined>(undefined);
	let clickMarker = $state<Marker | undefined>(undefined);

	const markerLocations = $state(markers as [number, number][]);

	const initialView: [number, number] = $derived([lat, lon]);

	function createMap(container: HTMLElement): Map {
		let m = new Map(container, { preferCanvas: true }).setView(initialView, zoom || 5, {
			animate: true
		});
		new TileLayer(
			'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
			{
				attribution:
					'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
			}
		).addTo(m);
		m.dragging.disable(); // Disable dragging for now
		m.touchZoom.disable(); // Disable touch zoom for now

		// Add click event listener to the map
		m.on('click', (e: LeafletMouseEvent) => {
			const { lat: clickLat, lng: clickLng } = e.latlng;

			// Call the onclick callback if provided
			onclick?.(clickLat, clickLng, e);

			// Show click marker if enabled
			if (showClickMarker) {
				// Remove existing click marker
				if (clickMarker) {
					m.removeLayer(clickMarker);
				}

				// Create new click marker with a distinct style
				clickMarker = new Marker([clickLat, clickLng], {
					icon: new DivIcon({
						html: `<div style="
							background: #ff0000;
							width: 12px;
							height: 12px;
							border-radius: 50%;
							border: 2px solid white;
							box-shadow: 0 2px 4px rgba(0,0,0,0.5);
							transform: translate(-50%, -50%);
						"></div>`,
						className: 'click-marker',
						iconSize: [12, 12],
						iconAnchor: [6, 6]
					})
				}).addTo(m);

				// Add popup with coordinates
				clickMarker
					.bindPopup(
						`
							<div style="text-align: center;">
								<strong>Clicked Location</strong><br>
								<small>Lat: ${clickLat.toFixed(6)}<br>
								Lng: ${clickLng.toFixed(6)}</small>
							</div>
						`
					)
					.openPopup();
			}
		});

		return m;
	}

	let eye = $state(true);
	let lines = $state(true);

	let toolbar = new Control({ position: 'topright' });
	let toolbarComponent: any = $state(null);

	toolbar.onAdd = (map: Map) => {
		let div = document.createElement('div');
		toolbarComponent = mount(MapToolbar, {
			target: div,
			props: {
				onclickeye: (visible: boolean) => {
					eye = visible;
				},
				onclicklines: (visible: boolean) => {
					lines = visible;
				},
				onclickreset: () => {
					map.setView(initialView, zoom || 5, { animate: true });
					// Clear click marker on reset
					if (clickMarker) {
						map.removeLayer(clickMarker);
						clickMarker = undefined;
					}
				}
			}
		});

		return div;
	};

	toolbar.onRemove = () => {
		if (toolbarComponent) {
			unmount(toolbarComponent);
			toolbarComponent = null;
		}
	};

	// Create a popup with a Svelte component inside it and handle removal when the popup is torn down.
	// `createFn` will be called whenever the popup is being created, and should create and return the component.
	function bindPopup(marker: Marker, createFn: (container: HTMLElement) => any) {
		let popupComponent: any;
		marker.bindPopup(() => {
			let container = document.createElement('div');
			popupComponent = createFn(container);
			return container;
		});

		marker.on('popupclose', () => {
			if (popupComponent) {
				let old = popupComponent;
				popupComponent = null;
				// Wait to destroy until after the fadeout completes.
				setTimeout(() => {
					unmount(old);
				}, 500);
			}
		});
	}

	function markerIcon(count: number): DivIcon {
		let html = `<div class="map-marker"><div>${markerIcons.library}</div><div class="marker-text">${count}</div></div>`;
		return new DivIcon({
			html,
			className: 'map-marker'
		});
	}

	function createMarker(loc: [number, number]): Marker {
		let count = Math.ceil(Math.random() * 25);
		let icon = markerIcon(count);
		let marker = new Marker(loc, { icon });

		bindPopup(marker, (m: HTMLElement) => {
			let c = mount(MarkerPopup, {
				target: m,
				props: {
					count,
					onchange: (newCount: number) => {
						count = newCount;
						marker.setIcon(markerIcon(count));
					}
				}
			});

			return c;
		});

		return marker;
	}

	function createLines(): Polyline {
		return new Polyline(markerLocations, { color: '#E4E', opacity: 0.5 });
	}

	let markerLayers: LayerGroup | undefined = $state(undefined);
	let lineLayers: Polyline | undefined = $state(undefined);

	function mapAction(container: HTMLElement) {
		map = createMap(container);
		toolbar.addTo(map);

		markerLayers = new LayerGroup();
		for (let location of markerLocations) {
			let m = createMarker(location);
			markerLayers.addLayer(m);
		}

		lineLayers = createLines();

		markerLayers.addTo(map);
		lineLayers.addTo(map);

		return {
			destroy: () => {
				if (toolbar && map) {
					toolbar.remove();
				}
				if (map) {
					map.remove();
					map = undefined;
				}
			}
		};
	}

	// Reactive updates using $effect instead of $:
	$effect(() => {
		if (markerLayers && map) {
			if (eye) {
				markerLayers.addTo(map);
			} else {
				markerLayers.remove();
			}
		}
	});

	$effect(() => {
		if (lineLayers && map) {
			if (lines) {
				lineLayers.addTo(map);
			} else {
				lineLayers.remove();
			}
		}
	});

	// Add effect to update map view when lat/lon props change
	$effect(() => {
		if (map && lat !== undefined && lon !== undefined) {
			const currentCenter = map.getCenter();
			const newLat = lat;
			const newLon = lon;

			// Only update if the coordinates have actually changed significantly
			// (avoid unnecessary updates from tiny floating point differences)
			if (
				Math.abs(currentCenter.lat - newLat) > 0.000001 ||
				Math.abs(currentCenter.lng - newLon) > 0.000001
			) {
				map.setView([newLat, newLon], map.getZoom(), { animate: true });
			}
		}
	});

	function resizeMap() {
		if (map) {
			map.invalidateSize();
		}
	}
</script>

<svelte:window onresize={resizeMap} />

<div class="map" use:mapAction></div>

<style>
	.map {
		width: 100%;
		height: 100%;
	}

	.map :global(.marker-text) {
		width: 100%;
		text-align: center;
		font-weight: 600;
		background-color: #444;
		color: #eee;
		border-radius: 0.5rem;
	}

	.map :global(.map-marker) {
		width: 30px;
		transform: translateX(-50%) translateY(-25%);
	}

	.map :global(.click-marker) {
		background: transparent !important;
		border: none !important;
	}
</style>
