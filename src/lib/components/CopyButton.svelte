<!-- CopyEmoji.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type Events = {
		copied: string;
		error: Error;
	};

	const dispatch = createEventDispatcher<Events>();

	let {
		// Text to copy
		value,
		// Emoji to show normally
		emoji = '📋',
		// Emoji to show briefly after a successful copy
		copiedEmoji = '✅',
		// Tooltip / accessible label
		title = 'Copy to clipboard',
		// Size of the emoji
		size = '1.25rem',
		// How long to show the success emoji (ms)
		successMs = 1200,
		// Disable interaction
		disabled = false,
		// Extra classes if you want to style externally
		class: className = ''
	} = $props<{
		value: string;
		emoji?: string;
		copiedEmoji?: string;
		title?: string;
		size?: string;
		successMs?: number;
		disabled?: boolean;
		class?: string;
	}>();

	let showingSuccess = false;
	let lastTimer: number | null = null;

	async function copyText(text: string) {
		// Prefer async Clipboard API
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return;
		}
		// Fallback: hidden textarea (works without HTTPS in some contexts)
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.setAttribute('readonly', '');
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		ta.style.pointerEvents = 'none';
		document.body.appendChild(ta);
		ta.select();
		document.execCommand('copy'); // may be deprecated but still useful fallback
		document.body.removeChild(ta);
	}

	async function handleClick() {
		if (disabled || !value) return;
		try {
			await copyText(value);
			dispatch('copied', value);
			// Visual success feedback
			showingSuccess = true;
			if (lastTimer) window.clearTimeout(lastTimer);
			lastTimer = window.setTimeout(() => (showingSuccess = false), successMs);
		} catch (err) {
			dispatch('error', err as Error);
		}
	}
</script>

<button
	type="button"
	class="cw-copy-emoji {className}"
	onclick={handleClick}
	{title}
	aria-label={showingSuccess ? 'Copied' : title}
	aria-live="polite"
	{disabled}
>
	<span class="emoji" aria-hidden="true" style={`font-size:${size}`}
		>{showingSuccess ? copiedEmoji : emoji}</span
	>
</button>

<style>
	.cw-copy-emoji {
		/* reset-ish */
		background: transparent;
		border: none;
		padding: 0;
		margin: 0;
		cursor: pointer;
		line-height: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		user-select: none;
		border-radius: 0.5rem;
		transition:
			transform 120ms ease,
			background-color 120ms ease;
	}

	.cw-copy-emoji:focus-visible {
		outline: 2px solid #3b82f6; /* visible focus ring */
		outline-offset: 2px;
	}

	.cw-copy-emoji:hover:not(:disabled) {
		background-color: rgba(0, 0, 0, 0.06);
	}

	.cw-copy-emoji:active:not(:disabled) {
		transform: scale(0.96);
	}

	.cw-copy-emoji:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.emoji {
		display: inline-block;
	}
</style>
