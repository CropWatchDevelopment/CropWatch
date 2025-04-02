<script lang="ts">
	import { page } from '$app/stores';
	import SensorSelector from '$lib/components/Sensors/SensorSelector.svelte';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { Button } from 'svelte-ux';
	import { Card, Icon } from 'svelte-ux';
	import { mdiAlertCircleOutline, mdiArrowLeft } from '@mdi/js';

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
	<div class="flex items-center justify-center p-4">
		<Card class="flex w-full max-w-md flex-col items-center p-8 shadow-lg">
			<div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-500">
				<Icon path={mdiAlertCircleOutline} size="2.5rem" />
			</div>
			
			<h1 class="mb-2 text-center text-xl font-bold">Device Not Found</h1>
			
			<p class="mb-6 text-center">
				We couldn't find the device or location you're looking for. It might have been moved or deleted.
			</p>
			
			<Button 
				variant="fill" 
				color="primary" 
				class="mt-2" 
				icon={mdiArrowLeft}
				href="/app"
			>
				Return to Dashboard
			</Button>
		</Card>
	</div>
{/if}
