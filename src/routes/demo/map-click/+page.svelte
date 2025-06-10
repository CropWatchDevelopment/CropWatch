<script lang="ts">
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import { Button } from 'svelte-ux';

	// Sample data
	let selectedCoords = $state<{lat: number, lon: number} | null>(null);
	let clickHistory = $state<{lat: number, lon: number, timestamp: Date}[]>([]);
	
	// Map configuration
	let mapCenter = $state({ lat: 35.6762, lon: 139.6503 }); // Tokyo
	let mapZoom = $state(10);
	let showMarkers = $state(true);

	// Sample markers around Tokyo
	let markers: [number, number][] = [
		[35.6762, 139.6503], // Tokyo
		[35.6895, 139.6917], // Shinjuku
		[35.6586, 139.7454], // Akihabara
	];

	function handleMapClick(lat: number, lon: number, event: any) {
		selectedCoords = { lat, lon };
		clickHistory = [
			{ lat, lon, timestamp: new Date() },
			...clickHistory.slice(0, 9) // Keep last 10 clicks
		];
		console.log(`Map clicked at: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
	}

	function clearHistory() {
		clickHistory = [];
		selectedCoords = null;
	}

	function centerMapOnClick() {
		if (selectedCoords) {
			mapCenter = selectedCoords;
		}
	}
</script>

<svelte:head>
	<title>Map Click Demo | CropWatch</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 space-y-6">
	<div class="text-center">
		<h1 class="text-3xl font-bold mb-2">LeafletMap Click Demo</h1>
		<p class="text-gray-600">Click anywhere on the map to get coordinates</p>
	</div>

	<!-- Controls -->
	<div class="flex flex-wrap gap-4 justify-center">
		<Button 
			variant="outline" 
			on:click={clearHistory}
			disabled={clickHistory.length === 0}
		>
			Clear History
		</Button>
		<Button 
			variant="outline" 
			on:click={centerMapOnClick}
			disabled={!selectedCoords}
		>
			Center on Last Click
		</Button>
		<label class="flex items-center gap-2">
			<input type="checkbox" bind:checked={showMarkers} />
			Show Click Markers
		</label>
	</div>

	<!-- Current Selection Display -->
	{#if selectedCoords}
		<div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
			<h3 class="font-semibold text-blue-900 dark:text-blue-100 mb-2">Last Clicked Coordinates</h3>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-medium">Latitude:</span> 
					<span class="font-mono">{selectedCoords.lat.toFixed(6)}</span>
				</div>
				<div>
					<span class="font-medium">Longitude:</span> 
					<span class="font-mono">{selectedCoords.lon.toFixed(6)}</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Map Container -->
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
		<div class="h-96">
			<LeafletMap
				lat={mapCenter.lat}
				lon={mapCenter.lon}
				zoom={mapZoom}
				markers={markers}
				onclick={handleMapClick}
				showClickMarker={showMarkers}
			/>
		</div>
	</div>

	<!-- Click History -->
	{#if clickHistory.length > 0}
		<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
			<h3 class="font-semibold mb-3">Click History</h3>
			<div class="space-y-2 max-h-40 overflow-y-auto">
				{#each clickHistory as click, index}
					<div class="flex justify-between items-center text-sm p-2 bg-white dark:bg-gray-700 rounded border">
						<span class="font-mono">
							{click.lat.toFixed(6)}, {click.lon.toFixed(6)}
						</span>
						<span class="text-gray-500 text-xs">
							{click.timestamp.toLocaleTimeString()}
						</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Instructions -->
	<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
		<h3 class="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">How to Use</h3>
		<ul class="text-sm text-yellow-800 dark:text-yellow-200 space-y-1">
			<li>• Click anywhere on the map to get lat/lon coordinates</li>
			<li>• Toggle "Show Click Markers" to see visual markers where you clicked</li>
			<li>• Use the toolbar controls to toggle markers and lines visibility</li>
			<li>• Use the reset button in the toolbar to return to the original view</li>
		</ul>
	</div>
</div>
