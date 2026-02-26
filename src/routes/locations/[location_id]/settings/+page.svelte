<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import LocationEditPermissions from './LocationEditPermissions.svelte';
	import LocationPermissions from './LocationPermissions.svelte';
	import LocationUpdate from './LocationUpdate.svelte';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();
</script>

<LocationUpdate {data} {form} />
<LocationPermissions {data} {form} />
<LocationEditPermissions {data} {form} />
