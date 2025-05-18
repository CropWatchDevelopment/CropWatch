<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	let { data } = $props();
	let location = $derived(data.location);
</script>

<h1>All about this location</h1>

<div class="flex flex-col gap-2">
	<button onclick={() => goto(`${page.params.location_id}/settings`)}>Location Settings</button>

	<button onclick={() => goto(`${page.params.location_id}/devices/create`)}>add device</button>
</div>

<pre>{JSON.stringify(location, null, 2)}</pre>