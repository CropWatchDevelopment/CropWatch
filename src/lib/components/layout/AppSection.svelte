<script lang="ts">
	import type { Snippet } from 'svelte';

	type SectionGap = 'sm' | 'md' | 'lg';

	interface Props {
		children?: Snippet;
		gap?: SectionGap;
		class?: string;
	}

	const gapBySize: Record<SectionGap, string> = {
		sm: 'var(--cw-space-2)',
		md: 'var(--cw-space-3)',
		lg: 'var(--cw-space-4)'
	};

	let { children, gap = 'md', class: className = '' }: Props = $props();
</script>

<section class={`app-section ${className}`} style={`--app-section-gap:${gapBySize[gap]};`}>
	{#if children}
		{@render children()}
	{/if}
</section>

<style>
	.app-section {
		display: flex;
		flex-direction: column;
		gap: var(--app-section-gap);
		min-width: 0;
	}
</style>
