<script lang="ts">
	import type { Snippet } from 'svelte';

	type StackGap = 'sm' | 'md' | 'lg';

	interface Props {
		children?: Snippet;
		gap?: StackGap;
		padded?: boolean;
		class?: string;
	}

	const gapBySize: Record<StackGap, string> = {
		sm: 'var(--cw-space-2)',
		md: 'var(--cw-space-3)',
		lg: 'var(--cw-space-4)'
	};

	let { children, gap = 'md', padded = false, class: className = '' }: Props = $props();
</script>

<div
	class={`app-form-stack ${padded ? 'app-form-stack--padded' : ''} ${className}`}
	style={`--app-form-stack-gap:${gapBySize[gap]};`}
>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.app-form-stack {
		display: flex;
		flex-direction: column;
		gap: var(--app-form-stack-gap);
		min-width: 0;
	}

	.app-form-stack--padded {
		padding: var(--cw-space-4);
	}
</style>
