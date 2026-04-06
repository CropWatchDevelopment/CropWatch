<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children?: Snippet;
		stackOnMobile?: boolean;
		class?: string;
	}

	let { children, stackOnMobile = true, class: className = '' }: Props = $props();
</script>

<div class={`app-action-row ${stackOnMobile ? 'app-action-row--stack-mobile' : ''} ${className}`}>
	{#if children}
		{@render children()}
	{/if}
</div>

<style>
	.app-action-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		align-items: center;
		gap: var(--cw-space-3);
	}

	@media (max-width: 639px) {
		.app-action-row--stack-mobile {
			flex-direction: column;
			align-items: stretch;
		}

		.app-action-row--stack-mobile :global(.cw-button) {
			width: 100%;
		}
	}
</style>
