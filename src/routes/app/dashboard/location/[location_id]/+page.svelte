<script lang="ts">
	import LeafletMap from '$lib/components/maps/leaflet/LeafletMap.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import LocationInfoCard from '$lib/components/dashboard/LocationInfoCard.svelte';
	import { locale, _ } from 'svelte-i18n';
	import Header from './Header.svelte';

	let { data } = $props();
	const location = data.location!;
	const locationId = data.locationId;

	// State for clicked coordinates
	let clickedCoords = $state<{ lat: number; lon: number } | null>(null);

	function handleMapClick(lat: number, lon: number) {
		clickedCoords = { lat, lon };
		//console.log(`Clicked at: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
	}
</script>

<svelte:head>
	<title>Location: {location.name} | CropWatch</title>
</svelte:head>

<Header {location} basePath={`/app/dashboard/location/${locationId}`}>
	<Button variant="secondary" href={`/app/dashboard/location/${locationId}/settings`}>
		{$_('Settings')}
	</Button>
	<Button variant="primary" href={`/app/dashboard/location/${locationId}/devices/create`}>
		{$_('Add Device')}
	</Button>
</Header>

<div class="flex flex-col gap-4 p-4 lg:flex-row">
	<!-- Left pane -->
	<div
		class="stats-column grid grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:w-[320px] lg:grid-cols-1 lg:flex-col lg:gap-6"
	>
		<!-- Map -->
		<div class="w-full overflow-hidden rounded-lg shadow-md">
			<div class="aspect-square">
				<!-- Do something about this horrible IFRAME later on -->
				<LeafletMap
					lat={location.lat || 0}
					lon={location.long || 0}
					zoom={location.map_zoom || 13}
					markers={[]}
					onclick={handleMapClick}
					showClickMarker={true}
				/>
			</div>
			<!-- Display clicked coordinates if available -->
			{#if clickedCoords}
				<div class="border-border-subtle bg-surface-muted mt-2 rounded-lg border p-3">
					<p class="text-text text-sm font-medium">
						Clicked Coordinates:
						<span class="font-mono"
							>{clickedCoords.lat.toFixed(6)}, {clickedCoords.lon.toFixed(6)}</span
						>
					</p>
				</div>
			{/if}
		</div>
		<!-- Details -->
		<LocationInfoCard {location} />
	</div>
	<!-- Right pane -->
	<div class="border-border relative flex-1 border-t pt-4 lg:border-t-0 lg:pt-0">
		<!-- Devices List -->
		<section>
			<h2 class="text-text-secondary mb-2 text-xl font-semibold">{$_('Devices')}</h2>
			{#await data.devices}
				Loading devices...
			{:then devices}
				{#if devices.length > 0}
					<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
						{#each devices as device}
							<div
								class="bg-card border-border-subtle flex flex-row items-center gap-2 rounded-lg border p-4 shadow-sm"
							>
								<div class="flex-1 overflow-hidden">
									<h3 class="mb-1 truncate text-lg font-medium">
										<a
											href={`/app/dashboard/location/${locationId}/devices/${device.dev_eui}`}
											class="text-primary hover:text-primary-hover !no-underline hover:!underline"
										>
											{device.name}
										</a>
									</h3>
									<p class="text-text-muted text-xs">
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
										{$_('Settings')}
									</Button>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="text-text-muted text-center">{$_('No devices found for this location.')}</p>
				{/if}
			{/await}
		</section>
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";
</style>
