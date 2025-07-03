<script lang="ts">
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { Snippet } from 'svelte';
	import { _ } from 'svelte-i18n';

	type Props = {
		device: DeviceWithType;
		basePath: string;
		children?: Snippet;
		controls?: Snippet;
	};

	let { device, basePath, children, controls }: Props = $props();
</script>

<header
	class="sticky top-0 z-9999 flex flex-col items-start justify-between gap-4 border-b border-gray-300 p-4 md:flex-row md:items-end dark:border-neutral-400"
	style:background-color="var(--color-background)"
>
	<h1 class="flex w-full flex-1 flex-row items-center gap-4 md:flex-row md:items-end">
		<div class="w-full text-2xl font-semibold text-gray-900 lg:text-3xl dark:text-gray-100">
			{device.name}
		</div>
		<div class="flex w-full justify-end">{@render controls?.()}</div>
	</h1>
	{#if children}
		{@render children?.()}
	{:else if basePath}
		<Button variant="secondary" href={basePath}>« {$_('Back to Device')}</Button>
	{/if}
</header>
