<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import Date from '$lib/components/ui/Date.svelte';
	import NotificationsBell from '$lib/components/ui/NotificationsBell.svelte';
	import { ProgressCircle } from 'svelte-ux';
	import type { Tables } from '../../../../database.types';

	const location: Promise<Tables<'cw_locations'>[]> = browser
		? fetch(`/api/v1/locations/${$page.params.location_id}/devices`, { method: 'GET' }).then((r) =>
				r.json()
			)
		: Promise.resolve([]);
</script>

<div class="bg-gradient-to-b from-[#132017] to-[#7F8D7F] relative h-screen px-4">
	<Date />
	<div class="mt-8 flex justify-between">
		<Back />
		<NotificationsBell />
	</div>
	{#await location}
		<ProgressCircle />
	{:then loc}
		<pre>{JSON.stringify(loc, null, 2)}</pre>
	{/await}
</div>
