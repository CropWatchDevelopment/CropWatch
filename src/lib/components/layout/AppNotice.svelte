<script lang="ts">
	import type { Snippet } from 'svelte';

	type NoticeTone = 'neutral' | 'info' | 'warning' | 'danger' | 'success';

	interface Props {
		children?: Snippet;
		title?: string;
		tone?: NoticeTone;
		ariaLive?: 'off' | 'polite' | 'assertive';
		role?: string;
		class?: string;
	}

	let {
		children,
		title = '',
		tone = 'neutral',
		ariaLive,
		role,
		class: className = ''
	}: Props = $props();
</script>

<section class={`app-notice app-notice--${tone} ${className}`} aria-live={ariaLive} {role}>
	{#if title}
		<p class="app-notice__title">{title}</p>
	{/if}

	{#if children}
		<div class="app-notice__body">
			{@render children()}
		</div>
	{/if}
</section>

<style>
	.app-notice {
		display: grid;
		gap: var(--cw-space-2);
		padding: var(--cw-space-3);
		border: 1px solid var(--app-notice-border);
		border-radius: var(--cw-radius-lg);
		background: var(--app-notice-bg);
		color: var(--app-notice-text);
	}

	.app-notice__title {
		margin: 0;
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
	}

	.app-notice__body {
		display: grid;
		gap: var(--cw-space-2);
	}

	.app-notice__body :global(p),
	.app-notice__body :global(ul),
	.app-notice__body :global(dl) {
		margin: 0;
	}

	.app-notice--neutral {
		--app-notice-bg: var(--cw-bg-subtle);
		--app-notice-border: var(--cw-border-muted);
		--app-notice-text: var(--cw-text-secondary);
	}

	.app-notice--info {
		--app-notice-bg: color-mix(in srgb, var(--cw-info-500) 10%, var(--cw-bg-subtle));
		--app-notice-border: color-mix(in srgb, var(--cw-info-500) 28%, var(--cw-border-muted));
		--app-notice-text: var(--cw-text-primary);
	}

	.app-notice--warning {
		--app-notice-bg: color-mix(in srgb, var(--cw-warning-500) 10%, var(--cw-bg-subtle));
		--app-notice-border: color-mix(in srgb, var(--cw-warning-500) 28%, var(--cw-border-muted));
		--app-notice-text: var(--cw-text-primary);
	}

	.app-notice--danger {
		--app-notice-bg: color-mix(in srgb, var(--cw-danger-500) 12%, var(--cw-bg-subtle));
		--app-notice-border: color-mix(in srgb, var(--cw-danger-500) 30%, var(--cw-border-muted));
		--app-notice-text: var(--cw-text-primary);
	}

	.app-notice--success {
		--app-notice-bg: color-mix(in srgb, var(--cw-success-500) 10%, var(--cw-bg-subtle));
		--app-notice-border: color-mix(in srgb, var(--cw-success-500) 24%, var(--cw-border-muted));
		--app-notice-text: var(--cw-text-primary);
	}
</style>
