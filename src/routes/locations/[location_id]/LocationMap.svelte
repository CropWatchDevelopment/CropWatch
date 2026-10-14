<script lang="ts">
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { Map as MapLibreMap, MapOptions, Marker } from 'maplibre-gl';
	// MapLibre finds its worker relative to its own file, which breaks once Vite
	// pre-bundles (dev) or hashes (build) it. Let Vite bundle the worker and
	// hand MapLibre the resulting URL instead.
	import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
	import { untrack } from 'svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { DeviceHealth } from './location-overview';

	interface DevicePin {
		name: string;
		lat: number;
		long: number;
		health: DeviceHealth;
	}

	interface Props {
		/** Pinned position; null shows the map without a pin (picker before a choice). */
		lat: number | null;
		long: number | null;
		zoom?: number | null;
		name: string;
		devices?: DevicePin[];
		/** Click the map or drag the pin to choose a position. */
		editable?: boolean;
		onpick?: (lat: number, long: number) => void;
		onzoomchange?: (zoom: number) => void;
	}

	let {
		lat,
		long,
		zoom = null,
		name,
		devices = [],
		editable = false,
		onpick,
		onzoomchange
	}: Props = $props();

	let container: HTMLDivElement;

	// OpenStreetMap raster tiles: free, no key. The attribution is a fixed
	// string; MapLibre renders it as HTML, so never build it from data.
	const OSM_STYLE: MapOptions['style'] = {
		version: 8,
		sources: {
			osm: {
				type: 'raster',
				tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
				tileSize: 256,
				maxzoom: 19,
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}
		},
		layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
	};
	// Whole-of-Japan view for a picker that has no position yet ([long, lat]).
	const FALLBACK_CENTER: [number, number] = [138.25, 36.2];
	const FALLBACK_ZOOM = 5;
	const DEFAULT_ZOOM = 16;
	// Below this zoom a newly set position is too small to see, so zoom in to it.
	const MIN_FOCUS_ZOOM = 13;

	// MapLibre and the map live outside $state: they are imperative handles,
	// and `ready` is what tells the other effects the map exists.
	let maplibre: typeof import('maplibre-gl') | null = null;
	let map: MapLibreMap | null = null;
	let marker: Marker | null = null;
	let deviceMarkers: Marker[] = [];
	let resizeObserver: ResizeObserver | null = null;
	let ready = $state(false);

	// ~10 cm precision; more digits only add noise.
	const round = (value: number) => Math.round(value * 1e6) / 1e6;

	function pick(next: { lat: number; lng: number }) {
		onpick?.(round(next.lat), round(next.lng));
	}

	// Teardrop pin, built from DOM nodes (no HTML strings), tip at the bottom.
	function createLocationPin(): HTMLElement {
		const svgNs = 'http://www.w3.org/2000/svg';
		const element = document.createElement('div');
		element.className = 'location-map__pin';
		const svg = document.createElementNS(svgNs, 'svg');
		svg.setAttribute('viewBox', '0 0 28 36');
		svg.setAttribute('width', '28');
		svg.setAttribute('height', '36');
		svg.setAttribute('aria-hidden', 'true');
		const drop = document.createElementNS(svgNs, 'path');
		drop.setAttribute('d', 'M14 35C14 35 2 21.5 2 13.5a12 12 0 1 1 24 0C26 21.5 14 35 14 35Z');
		drop.setAttribute('class', 'location-map__pin-body');
		const dot = document.createElementNS(svgNs, 'circle');
		dot.setAttribute('cx', '14');
		dot.setAttribute('cy', '13.5');
		dot.setAttribute('r', '4.5');
		dot.setAttribute('class', 'location-map__pin-dot');
		svg.append(drop, dot);
		element.append(svg);
		return element;
	}

	// Built once; later prop changes move the pin instead of rebuilding the map.
	$effect(() => {
		let cancelled = false;
		const initial = untrack(() => ({ lat, long, zoom, editable }));

		// MapLibre needs WebGL and `window`, so load it only in the browser.
		import('maplibre-gl').then((lib) => {
			if (cancelled) return;
			maplibre = lib;
			lib.setWorkerUrl(maplibreWorkerUrl);
			const hasPosition = initial.lat != null && initial.long != null;
			map = new lib.Map({
				container,
				style: OSM_STYLE,
				center: hasPosition ? [initial.long!, initial.lat!] : FALLBACK_CENTER,
				zoom: hasPosition
					? initial.zoom && initial.zoom > 0
						? initial.zoom
						: DEFAULT_ZOOM
					: FALLBACK_ZOOM,
				scrollZoom: initial.editable,
				dragRotate: false,
				pitchWithRotate: false,
				attributionControl: { compact: true }
			});
			map.touchZoomRotate.disableRotation();
			map.addControl(
				new lib.NavigationControl({ showCompass: false, visualizePitch: false }),
				'top-left'
			);
			if (initial.editable) {
				map.on('click', (event) => pick(event.lngLat));
				map.on('zoomend', () => map && onzoomchange?.(Math.round(map.getZoom())));
			}
			// The card's height settles after MapLibre measures it; re-measure so
			// the canvas always covers the whole box.
			resizeObserver = new ResizeObserver(() => map?.resize());
			resizeObserver.observe(container);
			ready = true;
		});

		return () => {
			cancelled = true;
			resizeObserver?.disconnect();
			resizeObserver = null;
			ready = false;
			for (const deviceMarker of deviceMarkers) deviceMarker.remove();
			deviceMarkers = [];
			marker?.remove();
			marker = null;
			map?.remove();
			map = null;
		};
	});

	// Keep the location pin on lat/long, and bring it into view when it was
	// set from outside the map (typed, pasted, geolocated, centred on devices).
	$effect(() => {
		if (!ready || !maplibre || !map) return;
		if (lat == null || long == null) {
			marker?.remove();
			marker = null;
			return;
		}
		const position: [number, number] = [long, lat];
		if (!marker) {
			const element = createLocationPin();
			// Attributes only: the name is user data.
			element.setAttribute(
				'aria-label',
				untrack(() => name)
			);
			element.title = untrack(() => name);
			marker = new maplibre.Marker({ element, anchor: 'bottom', draggable: editable })
				.setLngLat(position)
				.addTo(map);
			marker.on('dragend', () => marker && pick(marker.getLngLat()));
		} else {
			marker.setLngLat(position);
		}
		untrack(() => {
			if (!map) return;
			if (map.getZoom() < MIN_FOCUS_ZOOM) {
				map.jumpTo({
					center: position,
					zoom: zoom && zoom >= MIN_FOCUS_ZOOM ? zoom : DEFAULT_ZOOM
				});
			} else if (!map.getBounds().contains(position)) {
				map.panTo(position);
			}
		});
	});

	// Device pins redraw on their own so live health updates don't rebuild the map.
	$effect(() => {
		if (!ready || !maplibre || !map) return;
		const lib = maplibre;
		const target = map;
		for (const deviceMarker of deviceMarkers) deviceMarker.remove();
		deviceMarkers = devices.map((pin) => {
			const element = document.createElement('div');
			element.className = `location-map__device location-map__device--${pin.health}`;
			element.setAttribute('aria-label', pin.name);
			// setText, never setHTML: device names are user-editable.
			const popup = new lib.Popup({
				closeButton: false,
				closeOnClick: false,
				offset: 10,
				className: 'location-map__popup'
			}).setText(pin.name);
			element.addEventListener('mouseenter', () =>
				popup.setLngLat([pin.long, pin.lat]).addTo(target)
			);
			element.addEventListener('mouseleave', () => popup.remove());
			return new lib.Marker({ element }).setLngLat([pin.long, pin.lat]).addTo(target);
		});
	});
</script>

<div
	bind:this={container}
	class="location-map"
	class:location-map--editable={editable}
	role="region"
	aria-label={m.location_detail_map_label({ name })}
></div>

<style>
	.location-map {
		height: 100%;
		min-height: 20rem;
		width: 100%;
		border-radius: var(--cw-radius-lg);
		border: 1px solid var(--cw-border-muted);
		overflow: hidden;
		/* Keep the map's own layers under app overlays (menus, dialogs, toasts). */
		position: relative;
		z-index: 0;
	}

	.location-map--editable :global(.maplibregl-canvas-container) {
		cursor: crosshair;
	}

	:global(.location-map__pin) {
		filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.35));
	}

	:global(.location-map__pin-body) {
		fill: var(--cw-primary-500);
		stroke: var(--cw-primary-900);
		stroke-width: 2;
	}

	:global(.location-map__pin-dot) {
		fill: var(--cw-primary-900);
	}

	:global(.location-map__device) {
		width: 14px;
		height: 14px;
		border-radius: 50%;
		border: 2px solid var(--cw-gray-900);
		box-sizing: border-box;
	}

	:global(.location-map__device--online) {
		background: var(--cw-success-400);
	}

	:global(.location-map__device--offline) {
		background: var(--cw-danger-400);
	}

	:global(.location-map__device--never) {
		background: var(--cw-status-loading);
	}

	:global(.location-map__popup .maplibregl-popup-content) {
		padding: var(--cw-space-1) var(--cw-space-2);
		font-size: var(--cw-text-xs);
		color: var(--cw-gray-900);
		border-radius: var(--cw-radius-md);
	}
</style>
