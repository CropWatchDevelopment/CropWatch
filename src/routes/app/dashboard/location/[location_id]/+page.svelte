<script lang="ts">
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import { locale } from 'svelte-i18n';
	import Header from './Header.svelte';

	let { data } = $props();
	const location = data.location!;
	const locationId = data.locationId;

	// State for clicked coordinates
	let clickedCoords = $state<{ lat: number; lon: number } | null>(null);

	function handleMapClick(lat: number, lon: number) {
		clickedCoords = { lat, lon };
		console.log(`Clicked at: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
	}
</script>

<svelte:head>
	<title>Location: {location.name} | CropWatch</title>
</svelte:head>

<Header {location} basePath={`/app/dashboard/location/${locationId}`}>
	<Button variant="secondary" href={`/app/dashboard/location/${locationId}/settings`}>
		Settings
	</Button>
	<Button variant="primary" href={`/app/dashboard/location/${locationId}/devices/create`}>
		Add Device
	</Button>
</Header>

<div class="flex flex-col gap-4 p-4 lg:flex-row">
	<!-- Left pane -->
	<div
		class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:w-[320px] lg:grid-cols-1 lg:flex-col lg:gap-6"
	>
		<!-- Map -->
		<div class="w-full overflow-hidden rounded-lg shadow-md">
			<div class="aspect-square">
				<!-- Do something about this horrible IFRAME later on -->
				<LeafletMap
					lat={location.lat || 0}
					lon={location.long || 0}
					zoom={location.map_zoom || 13}
					markers={data.markers || []}
					onclick={handleMapClick}
					showClickMarker={true}
				/>
			</div>
			<!-- Display clicked coordinates if available -->
			{#if clickedCoords}
				<div
					class="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
				>
					<p class="text-sm font-medium text-blue-900 dark:text-blue-100">
						Clicked Coordinates:
						<span class="font-mono"
							>{clickedCoords.lat.toFixed(6)}, {clickedCoords.lon.toFixed(6)}</span
						>
					</p>
				</div>
			{/if}
		</div>
		<!-- Details -->
		<section>
			<h2>Location Details</h2>
			<div
				class="grid grid-rows-1 gap-2 rounded-lg bg-gray-50 p-4 text-sm shadow-sm dark:bg-zinc-800"
			>
				<div>
					<span class="text-gray-500/80 dark:text-gray-300/80">Location ID:</span>
					{location.location_id}
				</div>
				<div>
					<span class="text-gray-500/80 dark:text-gray-300/80">Created:</span>
					{new Date(location.created_at).toLocaleDateString($locale ?? undefined, {
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}
				</div>
				<div>
					<span class="text-gray-500/80 dark:text-gray-300/80">Coordinates:</span>
					{location.lat?.toFixed(6)}, {location.long?.toFixed(6)}
				</div>
			</div>
		</section>
	</div>
	<!-- Right pane -->
	<div class="relative flex-1 border-t-1 border-neutral-400 pt-4 lg:border-t-0 lg:pt-0">
		<!-- Devices List -->
		<section>
			<h2>Devices</h2>
			{#await data.devices}
				Loading devices...
			{:then devices}
				{#if devices.length > 0}
					<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
						{#each devices as device}
							<div
								class="flex flex-row items-center gap-2 rounded-lg bg-gray-50 p-4 shadow-sm dark:bg-gray-800/50"
							>
								<div class="flex-1 overflow-hidden">
									<h3 class="mb-1 truncate text-lg font-medium">
										<a
											href={`/app/dashboard/location/${locationId}/devices/${device.dev_eui}`}
											class="text-blue-500 !no-underline hover:text-blue-600 hover:!underline dark:text-blue-400 dark:hover:text-blue-500"
										>
											{device.name}
										</a>
									</h3>
									<p class="text-xs text-gray-500">
										<strong>EUI:</strong>
										{device.dev_eui}
									</p>
								</div>
								<div class="flex justify-end gap-2">
									<Button
										size="sm"
										variant="ghost"
										href={`/app/dashboard/location/${locationId}/devices/${device.dev_eui}/settings`}
									>
										Settings
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-muted text-center">No devices found for this location.</p>
				{/if}
			{/await}
		</section>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	h2 {
		@apply mb-2 text-xl font-semibold text-gray-600;

		:global(.dark) & {
			@apply text-gray-300;
		}
	}
</style>
