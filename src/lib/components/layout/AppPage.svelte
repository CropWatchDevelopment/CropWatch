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
		full: '100%'
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
		width: 100%;
		min-width: 0;
		padding: var(--cw-space-3);
	}

	.app-page__shell {
		width: min(100%, var(--app-page-max-width));
		min-width: 0;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	@media (min-width: 640px) {
		.app-page {
			padding: var(--cw-space-4);
		}
	}
</style>
