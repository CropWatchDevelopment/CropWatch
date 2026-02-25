<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import LocationEditPermissions from './LocationEditPermissions.svelte';
	import LocationPermissions from './LocationPermissions.svelte';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();
</script>

<LocationPermissions {data} {form} />
<LocationEditPermissions {data} {form} />
