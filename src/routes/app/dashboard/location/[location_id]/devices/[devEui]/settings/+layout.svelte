<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { Snippet } from 'svelte';
	import Header from '../Header.svelte';
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let { location_id, devEui } = page.params;
	let device = data.device as DeviceWithType;
	let basePath = `/app/dashboard/location/${location_id}/devices/${devEui}`;

	if (!devEui) {
		goto('/dashboard'); // DevEui was not found, run to safety!
	}

	const links = [
		{ href: `${basePath}/settings`, label: 'General' },
		{ href: `${basePath}/settings/rules`, label: 'Notifications' },
		{ href: `${basePath}/settings/permissions`, label: 'Permissions' }
	];
</script>

<Header {device} {basePath} />

<div class="flex min-h-screen flex-col lg:flex-row">
	<div
		class="min-w-60 border-b border-gray-300 p-4 lg:border-r lg:border-b-0 dark:border-neutral-400"
	>
		<h2 class="text-lg font-semibold">Device Settings</h2>
		<nav class="mt-4 flex flex-row flex-wrap lg:flex-col">
			{#each links as { href, label }}
				<div>
					<a {href} aria-current={page.url.pathname?.endsWith(href) ? 'page' : undefined}>
						{label}
					</a>
				</div>
			{/each}
		</nav>
	</div>
	<div class="flex-1 p-4">
		{@render children()}
	</div>
</div>

<style lang="postcss">
	@reference "tailwindcss";

	nav a {
		@apply block rounded-md px-4 py-2 !no-underline;

		&[aria-current='page'] {
			@apply bg-gray-300;

			:global(.dark) & {
				@apply bg-gray-800;
			}
		}
	}
</style>
