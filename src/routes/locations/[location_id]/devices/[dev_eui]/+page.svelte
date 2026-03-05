<script lang="ts">
	import { page } from '$app/state';
	import { resolveDisplayComponent } from '$lib/config/deviceTables';
	import { CwSpinner } from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayComponent } from '$lib/interfaces/deviceDisplay';

	let { data }: { data: any } = $props();

	let devEui = $derived(page.params.dev_eui ?? '');
	let locationId = $derived(page.params.location_id ?? '');
	let authToken = $derived(data.authToken ?? null);
	let latestData = $derived(data.latestData ?? null);
	let locationName = $derived(data.device?.cw_locations?.name ?? 'Unknown');
	let historicalData = $derived(
		Array.isArray(data.deviceData)
			? data.deviceData
			: (data.deviceData as any)?.data ?? []
	);
	let loading = $state(false);
	
	// Resolve the display component from the registry
	let DisplayComponent = $state<DeviceDisplayComponent | null>(null);
		
		$effect(() => {
		const dataTable: string | null = data.dataTable ?? null;
		loading = true;
		resolveDisplayComponent(dataTable).then((comp) => {
			DisplayComponent = comp;
			loading = false;
		});
	});
</script>

<svelte:head>
	<title>Device Dashboard - {devEui.toUpperCase()} - CropWatch</title>
</svelte:head>

{#if loading || !DisplayComponent}
	<div class="dispatcher-loading">
		<CwSpinner />
		<p>Loading device display…</p>
	</div>
{:else}
	<DisplayComponent
		{devEui}
		{locationId}
		{locationName}
		{latestData}
		{historicalData}
		{loading}
		{authToken}
	/>
{/if}

<style>
	.dispatcher-loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 4rem 1rem;
		color: var(--cw-text-muted);
	}
</style>
