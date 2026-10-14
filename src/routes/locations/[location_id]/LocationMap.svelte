<script lang="ts">
	import 'leaflet/dist/leaflet.css';
	import type { LayerGroup, Map as LeafletMap, Marker } from 'leaflet';
	import { untrack } from 'svelte';
	import { plainText } from '$lib/maps/leaflet-content';
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

	const HEALTH_TOKEN: Record<DeviceHealth, string> = {
		online: '--cw-success-400',
		offline: '--cw-danger-400',
		never: '--cw-status-loading'
	};
	// Whole-of-Japan view for a picker that has no position yet.
	const FALLBACK_CENTER: [number, number] = [36.2, 138.25];
	const FALLBACK_ZOOM = 5;
	const DEFAULT_ZOOM = 16;
	// Below this zoom a newly set position is too small to see, so zoom in to it.
	const MIN_FOCUS_ZOOM = 13;

	// Leaflet and the map live outside $state: they are imperative handles,
	// and `ready` is what tells the other effects the map exists.
	let leaflet: typeof import('leaflet') | null = null;
	let map: LeafletMap | null = null;
	let marker: Marker | null = null;
	let pinLayer: LayerGroup | null = null;
	let resizeObserver: ResizeObserver | null = null;
	let ready = $state(false);

	// ~10 cm precision; more digits only add noise.
	const round = (value: number) => Math.round(value * 1e6) / 1e6;

	function pick(next: { lat: number; lng: number }) {
		onpick?.(round(next.lat), round(next.lng));
	}

	// Built once; later prop changes move the pin instead of rebuilding the map.
	$effect(() => {
		let cancelled = false;
		const initial = untrack(() => ({ lat, long, zoom, editable }));

		// Leaflet touches `window` at import time, so load it only in the browser.
		import('leaflet').then((L) => {
			if (cancelled) return;
			leaflet = L;
			const hasPosition = initial.lat != null && initial.long != null;
			map = L.map(container, { scrollWheelZoom: initial.editable }).setView(
				hasPosition ? [initial.lat!, initial.long!] : FALLBACK_CENTER,
				hasPosition
					? initial.zoom && initial.zoom > 0
						? initial.zoom
						: DEFAULT_ZOOM
					: FALLBACK_ZOOM
			);
			L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
				maxZoom: 19,
				attribution:
					'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
			}).addTo(map);
			if (initial.editable) {
				map.on('click', (event) => pick(event.latlng));
				map.on('zoomend', () => map && onzoomchange?.(map.getZoom()));
			}
			pinLayer = L.layerGroup().addTo(map);
			// The card's height settles after Leaflet measures it; re-measure so
			// tiles cover the whole box instead of leaving a gray band.
			resizeObserver = new ResizeObserver(() => map?.invalidateSize());
			resizeObserver.observe(container);
			ready = true;
		});

		return () => {
			cancelled = true;
			resizeObserver?.disconnect();
			resizeObserver = null;
			ready = false;
			map?.remove();
			map = null;
			marker = null;
			pinLayer = null;
		};
	});

	// Keep the location pin on lat/long, and bring it into view when it was
	// set from outside the map (typed, pasted, geolocated, centred on devices).
	$effect(() => {
		if (!ready || !leaflet || !map) return;
		if (lat == null || long == null) {
			marker?.remove();
			marker = null;
			return;
		}
		const position: [number, number] = [lat, long];
		if (!marker) {
			marker = leaflet
				.marker(position, {
					title: untrack(() => name),
					draggable: editable,
					keyboard: editable,
					icon: leaflet.divIcon({
						className: 'location-map__pin',
						html: '<span></span>',
						iconSize: [28, 28],
						iconAnchor: [14, 34]
					})
				})
				.addTo(map);
			marker.on('dragend', () => marker && pick(marker.getLatLng()));
		} else {
			marker.setLatLng(position);
		}
		untrack(() => {
			if (!map) return;
			if (map.getZoom() < MIN_FOCUS_ZOOM) {
				map.setView(position, zoom && zoom >= MIN_FOCUS_ZOOM ? zoom : DEFAULT_ZOOM);
			} else if (!map.getBounds().contains(position)) {
				map.panTo(position);
			}
		});
	});

	// Device pins redraw on their own so live health updates don't rebuild the map.
	$effect(() => {
		if (!ready || !leaflet || !pinLayer) return;
		const styles = getComputedStyle(document.documentElement);
		pinLayer.clearLayers();
		for (const pin of devices) {
			leaflet
				.circleMarker([pin.lat, pin.long], {
					radius: 7,
					color: styles.getPropertyValue('--cw-gray-900').trim(),
					weight: 2,
					fillColor: styles.getPropertyValue(HEALTH_TOKEN[pin.health]).trim(),
					fillOpacity: 1
				})
				.bindTooltip(plainText(pin.name))
				.addTo(pinLayer);
		}
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
		/* Keep Leaflet's panes under app overlays (menus, dialogs, toasts). */
		position: relative;
		z-index: 0;
	}

	.location-map--editable {
		cursor: crosshair;
	}

	:global(.location-map__pin span) {
		position: relative;
		display: block;
		width: 28px;
		height: 28px;
		border-radius: 50% 50% 50% 0;
		transform: rotate(-45deg);
		background: var(--cw-primary-500);
		border: 2px solid var(--cw-primary-900);
		box-shadow: var(--cw-shadow-md);
	}

	:global(.location-map__pin span)::after {
		content: '';
		position: absolute;
		inset: 8px;
		border-radius: 50%;
		background: var(--cw-primary-900);
	}
</style>
