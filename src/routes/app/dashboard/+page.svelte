<script lang="ts">
	import AllLocations from '$lib/components/UI/dashboard/AllLocations.svelte';
	import Spinner from '$lib/components/Spinner.svelte';

	let { data } = $props();
	let locationsPromise = $derived(data.locationsPromise);
</script>

<svelte:head>
	<title>IoT Dashboard</title>
</svelte:head>

<div class="dashboard-container">
	{#await locationsPromise}
		<Spinner />
	{:then locations}
		{#if locations}
			<AllLocations supabase={data.supabase} locations={locations.data} />
		{:else}
			<p>No locations found.</p>
		{/if}
	{/await}
</div>

<style>
	/* Ensure the devices panel grows when sidebar collapses */
	.devices-panel {
		/* background-color: var(--color-bg); */
		transition: all 0.3s ease;
		width: 100%;
		overflow: auto;
		/* background-color: var(--color-card); */
		border-radius: 0.5rem;
		padding: 1rem;
		box-shadow:
			0 4px 6px -1px rgba(0, 0, 0, 0.1),
			0 2px 4px -1px rgba(0, 0, 0, 0.06);
	}
	.loading,
	.loading-devices,
	.error {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 2rem;
		font-size: 1rem;
		color: var(--color-text-secondary);
	}

	.error {
		color: var(--color-danger);
	}
</style>
