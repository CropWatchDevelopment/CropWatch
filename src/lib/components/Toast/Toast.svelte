<script lang="ts">
	import { remove, type ToastType, type Toast } from '$lib/stores/toast.svelte';
	import { fly } from 'svelte/transition';
	import { Tween } from 'svelte/motion';
	import { linear, cubicIn, cubicOut } from 'svelte/easing';

	let { toast } = $props<{ toast: Toast }>();

	// Different icon content based on toast type
	const icons: Record<ToastType, string> = {
		success: '✓',
		error: '✕',
		warning: '⚠',
		info: 'ℹ',
		neutral: '•'
	};

	// Create a tween for progress tracking (starts at 100%, animates to 0%)
	const progress = new Tween(100, { easing: linear });

	// Set up the progress animation if toast has a timeout
	$effect(() => {
		if (toast.timeout && toast.timeout > 0) {
			// Animate progress from 100 to 0 over the toast timeout duration
			progress.set(0, {
				duration: toast.timeout,
				easing: (t) => t // Linear easing
			});
		}
	});

	function dismiss() {
		remove(toast.id);
	}
</script>

<div
	class="toast toast-{toast.type}"
	role="alert"
	aria-live="polite"
	aria-atomic="true"
	in:fly={{ y: 20, duration: 300, easing: cubicOut }}
	out:fly={{ y: -20, duration: 300, easing: cubicOut }}
>
	<div class="toast-icon">
		{icons[toast.type as ToastType]}
	</div>

	<div class="toast-content">
		<p>{toast.message}</p>
	</div>

	{#if toast.dismissible}
		<button class="toast-close" onclick={dismiss} aria-label="Dismiss notification"> × </button>
	{/if}

	{#if toast.timeout && toast.timeout > 0}
		<div class="toast-progress">
			<div class="toast-progress-bar" style="width: {progress.current}%"></div>
		</div>
	{/if}
</div>

<style>
	.toast {
		position: relative;
		display: flex;
		align-items: center;
		width: 100%;
		max-width: 400px;
		padding: 0.75rem 1rem;
		border-radius: 0.375rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		color: white;
		overflow: hidden;
	}

	.toast-success {
		background-color: var(--color-success, #43a047);
		color: #fafafa;
		font-weight: bold;
	}

	.toast-error {
		background-color: var(--color-error, #e53935);
		color: black;
		font-weight: bold;
	}

	.toast-warning {
		background-color: var(--color-warning, #ffa000);
		color: black;
		font-weight: bold;
	}

	.toast-info {
		background-color: var(--color-info, #1e88e5);

		font-weight: bold;
	}

	.toast-neutral {
		background-color: var(--color-foreground, #666666);

		font-weight: bold;
	}

	.toast-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		width: 1.5rem;
		height: 1.5rem;
		margin-right: 0.75rem;
		border-radius: 50%;
		background-color: rgba(255, 255, 255, 0.2);
		font-weight: bold;
	}

	.toast-content {
		flex: 1;
	}

	.toast-content p {
		margin: 0;
	}

	.toast-close {
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		margin-left: 0.75rem;
		border: none;
		background: transparent;
		color: white;
		font-size: 1.25rem;
		font-weight: bold;
		cursor: pointer;
		opacity: 0.8;
		transition: opacity 0.2s;
	}

	.toast-close:hover {
		opacity: 1;
	}

	.toast-progress {
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 3px;
		background-color: rgba(0, 0, 0, 0.1);
	}

	.toast-progress-bar {
		height: 100%;
		background-color: rgba(255, 255, 255, 0.7);
		transition: width 0.1s linear;
	}
</style>
