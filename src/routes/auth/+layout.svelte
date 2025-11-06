<script lang="ts">
	import type { Snippet } from 'svelte';
	const { children } = $props<{ children?: Snippet }>();
</script>

{@render children?.()}

<style>
	:global(.auth-panel) {
		background-color: rgba(255, 255, 255, 0.92);
		border-radius: 1.25rem;
		border: 1px solid rgba(255, 255, 255, 0.45);
		box-shadow: 0 30px 70px -50px rgba(15, 23, 42, 0.75);
		backdrop-filter: blur(24px);
	}

	:global(.dark .auth-panel) {
		background-color: rgba(17, 25, 40, 0.85);
		border-color: rgba(148, 163, 184, 0.35);
		box-shadow: 0 28px 70px -45px rgba(0, 0, 0, 0.9);
	}

	:global(.auth-primary-button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: 0.9rem;
		padding: 0.75rem 1.1rem;
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.5rem;
		color: #ffffff;
		background-image: linear-gradient(135deg, #2563eb, #4338ca);
		border: 1px solid rgba(37, 99, 235, 0.85);
		box-shadow: 0 20px 38px -18px rgba(37, 99, 235, 0.65);
		transition:
			transform 150ms ease,
			box-shadow 150ms ease,
			filter 150ms ease;
	}

	:global(.auth-primary-button:hover) {
		filter: brightness(1.05);
		transform: translateY(-1px);
		box-shadow: 0 24px 44px -18px rgba(37, 99, 235, 0.75);
	}

	:global(.auth-primary-button:focus-visible) {
		outline: none;
		box-shadow:
			0 0 0 3px rgba(191, 219, 254, 0.65),
			0 24px 44px -18px rgba(37, 99, 235, 0.75);
	}

	:global(.auth-primary-button:disabled) {
		cursor: not-allowed;
		opacity: 0.7;
		transform: none;
		filter: none;
		background-image: linear-gradient(135deg, #3b82f6, #6366f1);
		border-color: rgba(99, 102, 241, 0.7);
		box-shadow: none;
	}

	:global(.auth-secondary-button) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		border-radius: 0.9rem;
		padding: 0.75rem 1.1rem;
		font-size: 0.95rem;
		font-weight: 600;
		line-height: 1.5rem;
		color: var(--color-text);
		background-color: transparent;
		border: 1px solid rgba(148, 163, 184, 0.55);
		transition:
			background-color 150ms ease,
			color 150ms ease,
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	:global(.auth-secondary-button:hover) {
		background-color: rgba(148, 163, 184, 0.12);
		border-color: rgba(148, 163, 184, 0.82);
	}

	:global(.auth-secondary-button:focus-visible) {
		outline: none;
		box-shadow: 0 0 0 3px rgba(191, 219, 254, 0.5);
	}

	:global(.auth-secondary-button:disabled) {
		opacity: 0.65;
		cursor: not-allowed;
	}

	:global(.dark .auth-secondary-button) {
		color: var(--color-text);
		border-color: rgba(148, 163, 184, 0.35);
	}

	:global(.dark .auth-secondary-button:hover) {
		background-color: rgba(148, 163, 184, 0.2);
	}

	:global(.auth-button-icon) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-size: 1.1rem;
	}
</style>
