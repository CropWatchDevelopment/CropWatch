<script lang="ts">
	import type { Snippet } from 'svelte';

	type AppPageWidth = 'md' | 'lg' | 'xl' | 'full';

	interface Props {
		children?: Snippet;
		width?: AppPageWidth;
		/** Vertical placement when the page content is shorter than the viewport. */
		align?: 'top' | 'center';
		class?: string;
	}

	const maxWidthBySize: Record<AppPageWidth, string> = {
		md: '48rem',
		lg: '64rem',
		xl: '82rem',
		full: 'none'
	};

	let { children, width = 'xl', align = 'top', class: className = '' }: Props = $props();
</script>

<section
	class={`app-page ${align === 'center' ? 'app-page--center' : ''} ${className}`}
	style={`--app-page-max-width:${maxWidthBySize[width]};`}
>
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

	/* Center short content in the viewport; overflow-safe (tall content still
	   scrolls from the top because the auto margins collapse when space runs out). */
	.app-page--center .app-page__shell {
		flex: 0 0 auto;
		margin-block: auto;
	}

	@media (min-width: 640px) {
		.app-page {
			padding-block: var(--cw-space-2);
		}
	}
</style>
