<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import type { Location } from '$lib/models/Location';
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';

	type Props = {
		location: Location;
		basePath: string;
		children?: Snippet;
	};

	let { location, basePath, children }: Props = $props();
</script>

<header
	class="sticky top-0 z-9 flex flex-col items-start justify-between gap-4 border-b border-gray-300 p-4 md:flex-row md:items-end dark:border-neutral-400"
	style:background-color="var(--color-background)"
>
	<div class="flex-1">
		<h1 class="text-2xl font-semibold text-gray-900 lg:text-3xl dark:text-gray-100">
			{location.name}
		</h1>
		{#if location.description}
			<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{location.description}</p>
		{/if}
	</div>
	<div>
		{#if children}
			{@render children?.()}
		{:else if basePath}
			<Button variant="secondary" href={basePath}>{$_('« Back to Location Overview')}</Button>
		{/if}
	</div>
</header>
