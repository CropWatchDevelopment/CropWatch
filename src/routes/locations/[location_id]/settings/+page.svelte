<script lang="ts">
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import type { PageProps } from './$types';
	import { m } from '$lib/paraglide/messages.js';
	import LocationEditPermissions from './LocationEditPermissions.svelte';
	import LocationPermissions from './LocationPermissions.svelte';
	import LocationUpdate from './LocationUpdate.svelte';
	import { goto } from '$app/navigation';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.locations_settings_page_title({ name: data.locationName })}</title>
</svelte:head>

<CwButton onclick={() => goto(`/locations/${data.locationId}`)} class="back-button my-2">
	{m.locations_back_to_location()}
</CwButton>
<div class="settings-page overflow-y-scroll">
	<LocationUpdate {data} {form} />
	<LocationPermissions {data} />
	<LocationEditPermissions {data} />
</div>
