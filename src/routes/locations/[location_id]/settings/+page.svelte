<script lang="ts">
	import { AppPage } from '$lib/components/layout';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import LocationEditPermissions from './LocationEditPermissions.svelte';
	import LocationPermissions from './LocationPermissions.svelte';
	import LocationUpdate from './LocationUpdate.svelte';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.locations_settings_page_title({ name: data.locationName })}</title>
</svelte:head>

<AppPage>
	<CwButton
		id="location-settings-back-button"
		variant="secondary"
		size="sm"
		onclick={() =>
			goto(resolve('/locations/[location_id]', { location_id: String(data.locationId) }))}
	>
		&larr; {m.locations_back_to_location()}
	</CwButton>

	<LocationUpdate {data} />
	<LocationPermissions {data} />
	<LocationEditPermissions {data} />
</AppPage>
