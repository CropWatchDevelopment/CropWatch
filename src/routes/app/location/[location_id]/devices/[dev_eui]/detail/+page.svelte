<script lang="ts">
	import { page } from '$app/stores';
	import SensorSelector from '$lib/components/Sensors/SensorSelector.svelte';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { Button } from 'svelte-ux';

	let userContext = getUserState();
	let location_id: number = +$page.params.location_id; // This returns a STRING!!!!
	// let location = $derived(userContext.allLocations.find((loc) => loc.location_id === location_id));
	let device = $derived(
		userContext.allLocations
			.find((loc) => loc.location_id === location_id)
			?.cw_devices.find((dev) => dev.dev_eui === $page.params.dev_eui)
	);
</script>

{#if device}
	<SensorSelector {device} />
{:else}
	<p>Failed to load Location or device,</p>
	<Button href="/app">Go back</Button>
{/if}
