<script lang="ts">
	import type { Snippet } from 'svelte';

	type AppPageWidth = 'md' | 'lg' | 'xl' | 'full';

	interface Props {
		children?: Snippet;
		width?: AppPageWidth;
		class?: string;
	}

	const maxWidthBySize: Record<AppPageWidth, string> = {
		md: '48rem',
		lg: '64rem',
		xl: '82rem',
		full: 'none'
	};

	let { children, width = 'xl', class: className = '' }: Props = $props();
</script>

<section class={`app-page ${className}`} style={`--app-page-max-width:${maxWidthBySize[width]};`}>
	<div class="app-page__shell">
		{#if children}
			{@render children()}
		{/if}
	</div>
</section>

<style>
	.app-page {
		flex: 1 0 auto;
		display: flex;
		flex-direction: column;
		width: 100%;
		min-width: 0;
		padding-inline: var(--app-shell-padding-inline-start) var(--app-shell-padding-inline-end);
		padding-block: var(--cw-space-3) var(--cw-space-4);
	}

	.app-page__shell {
		flex: 1 0 auto;
		width: 100%;
		margin-inline: auto;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	@media (min-width: 640px) {
		.app-page {
			padding-block: var(--cw-space-4);
		}
	}
</style>
