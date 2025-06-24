<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let device = $state(data.device as DeviceWithType);
	let { location_id, devEui } = page.params;
	let basePath = `/app/dashboard/location/${location_id}/devices/${devEui}`;
</script>

<header
	class="sticky top-0 z-9999 flex flex-col items-start justify-between gap-4 border-b border-gray-300 p-4 sm:flex-row dark:border-neutral-400"
	style="background-color: var(--color-background)"
>
	<h1 class="flex-1 text-2xl font-semibold text-gray-900 lg:text-3xl dark:text-gray-100">
		{device.name}
	</h1>
	{#if page.route.id?.includes('/settings')}
		<Button variant="secondary" href={basePath}>« Back to Device</Button>
	{:else}
		<Button variant="secondary" href="{basePath}/settings">Settings</Button>
	{/if}
</header>

{@render children()}
