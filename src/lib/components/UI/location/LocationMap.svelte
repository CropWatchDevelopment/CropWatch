<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import { Avatar, Card, Header, Icon } from 'svelte-ux';
	import { mdiMapMarker } from '@mdi/js';

	let {
		latitude = $bindable(''),
		longitude = $bindable(''),
		locationName = $bindable('Location'),
		height = $bindable('400px')
	} = $props();

	// Map related variables
	let mapContainer: HTMLDivElement;
	let map: any;
	let marker: any;

	// Function to initialize the map
	async function initializeMap() {
		if (!browser) return;

		// Dynamically import Leaflet in the browser
		const L = await import('leaflet');

		// Make sure the map container exists
		if (!mapContainer) return;

		// Initialize the map if it doesn't exist yet
		if (!map) {
			// Set default coordinates if location coordinates are invalid
			const lat = parseFloat(latitude) || 0;
			const lng = parseFloat(longitude) || 0;

			// Create the map centered at the location coordinates with scrollWheelZoom disabled
			map = L.map(mapContainer, {
				scrollWheelZoom: false, // Disable scroll wheel zoom
				dragging: true, // Keep dragging enabled
				tap: true, // Enable tap for mobile
				touchZoom: true // Enable pinch-to-zoom on mobile
			}).setView([lat, lng], 18);

			// Add zoom control buttons so users can still zoom without the wheel
			L.control
				.zoom({
					position: 'topright'
				})
				.addTo(map);

			// Add satellite imagery tile layer from ESRI
			L.tileLayer(
				'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
				{
					attribution:
						'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
					maxZoom: 19
				}
			).addTo(map);

			// Add a marker at the location coordinates
			marker = L.marker([lat, lng])
				.addTo(map)
				.bindPopup(`<b>${locationName}</b><br>Lat: ${lat}, Long: ${lng}`);

			// Open the popup when the map loads
			marker.openPopup();

			// Add hover instruction to let users know how to zoom
			const mapElement = mapContainer;
			if (mapElement) {
				// Create and add a custom control for instructions
				const instructionControl = L.control({ position: 'bottomleft' });
				instructionControl.onAdd = function () {
					const div = L.DomUtil.create('div', 'map-instructions');
					div.innerHTML =
						'<div class="px-2 py-1 bg-black/70 text-white text-xs rounded-md">Use + / - buttons to zoom</div>';
					return div;
				};
				instructionControl.addTo(map);

				// Show the instruction briefly on hover
				mapElement.addEventListener('mouseenter', () => {
					const instructions = mapElement.querySelector('.map-instructions');
					if (instructions) {
						instructions.classList.add('visible');
						setTimeout(() => {
							instructions.classList.remove('visible');
						}, 3000);
					}
				});
			}
		}
	}

	// Update the map when coordinates change
	$effect(() => {
		if (map && marker) {
			const lat = parseFloat(latitude) || 0;
			const lng = parseFloat(longitude) || 0;

			// Update the map view and marker position
			map.setView([lat, lng], 13);
			marker.setLatLng([lat, lng]);
			marker.setPopupContent(`<b>${locationName}</b><br>Lat: ${lat}, Long: ${lng}`);
		}
	});

	// Handle map resize on window resize
	function handleResize() {
		if (map) {
			map.invalidateSize();
		}
	}

	// Initialize the map when the component mounts
	onMount(() => {
		// Add Leaflet CSS - this is needed for the map to display correctly
		if (browser) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
			link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
			link.crossOrigin = '';
			document.head.appendChild(link);

			// Initialize the map after a short delay to ensure the DOM is ready
			setTimeout(initializeMap, 100);

			// Add resize event listener
			window.addEventListener('resize', handleResize);
		}
	});

	// Clean up when the component is destroyed
	onDestroy(() => {
		if (map) {
			map.remove();
			map = null;
		}
		// Remove resize event listener
		if (browser) {
			window.removeEventListener('resize', handleResize);
		}
	});
</script>

<Card class="overflow-hidden rounded-lg shadow-lg">
	<Header
		title="Location Map"
		subheading="Visual representation of your location's coordinates"
		slot="header"
	>
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content font-bold">
				<Icon data={mdiMapMarker} class="text-2xl" />
			</Avatar>
		</div>
	</Header>
	<div
		bind:this={mapContainer}
		class="z-0 w-full"
		style={`height: ${browser ? 'min(60vh, 400px)' : height};`}
	></div>
	<div class="bg-gray-900 p-3 text-sm text-gray-400 sm:p-4">
		<p class="break-words">Coordinates: {latitude || 'Not set'}, {longitude || 'Not set'}</p>
		<p class="mt-1">
			Update the latitude and longitude in the settings to change the map location.
		</p>
	</div>
</Card>

<style>
	/* Override Leaflet's z-index which can cause issues with modals and dropdowns */
	:global(.leaflet-pane) {
		z-index: 1 !important;
	}
	:global(.leaflet-top, .leaflet-bottom) {
		z-index: 1 !important;
	}

	/* Custom instruction styling */
	:global(.map-instructions) {
		opacity: 0;
		transition: opacity 0.3s ease-in-out;
	}

	:global(.map-instructions.visible) {
		opacity: 1;
	}

	/* Make sure the map container responds properly */
	:global(.leaflet-container) {
		min-height: 250px;
		width: 100% !important;
	}
</style>
