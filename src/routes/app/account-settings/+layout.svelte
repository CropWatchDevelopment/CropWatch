<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import type { LayoutData } from './$types';
	import { _ } from 'svelte-i18n';
	import Header from '$lib/components/Header.svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();
	let basePath = `/app/account-settings`;

	const links = [
		{ href: `${basePath}/general`, label: `⚙️ ${$_('General')}`, hidden: false },
		{ href: `${basePath}/payment`, label: `💳 ${$_('Payment')}`, hidden: true },
		{
			href: `${basePath}/display-settings`,
			label: `🌍 ${$_('Units & Display Settings')}`,
			hidden: false
		}
	];
</script>

<Header {basePath} />

<div class="flex min-h-screen flex-col lg:flex-row">
	<div
		class="min-w-60 border-b border-gray-300 p-4 lg:border-r lg:border-b-0 dark:border-neutral-400"
	>
		<h2 class="text-lg font-semibold">{$_('Device Settings')}</h2>
		<nav class="mt-4 flex flex-row flex-wrap lg:flex-col">
			{#each links.filter((l) => !l.hidden) as { href, label }}
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
