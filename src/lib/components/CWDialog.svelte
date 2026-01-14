<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';

	interface Props {
		open?: boolean;
		title?: string;
		showCloseButton?: boolean;
		closeOnBackdrop?: boolean;
		closeOnEscape?: boolean;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		title = '',
		showCloseButton = true,
		closeOnBackdrop = true,
		closeOnEscape = true,
		children
	}: Props = $props();

	function handleKeydown(event: KeyboardEvent) {
		if (closeOnEscape && event.key === 'Escape') {
			open = false;
		}
	}

	function handleBackdropClick() {
		if (closeOnBackdrop) {
			open = false;
		}
	}

	function close() {
		open = false;
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		role="button"
		tabindex="-1"
		aria-label="Close dialog"
	>
		<!-- Dialog Panel -->
		<div
			class="relative max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-xl shadow-black/40 ring-1 ring-slate-800"
			transition:scale={{ duration: 150, start: 0.95 }}
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby={title ? 'dialog-title' : undefined}
			tabindex="-1"
		>
			<!-- Header -->
			{#if title || showCloseButton}
				<div class="mb-4 flex items-center justify-between">
					{#if title}
						<h2 id="dialog-title" class="text-lg font-semibold text-slate-100">
							{title}
						</h2>
					{:else}
						<div></div>
					{/if}

					{#if showCloseButton}
						<button
							type="button"
							class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
							onclick={close}
							aria-label="Close dialog"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-5 w-5"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					{/if}
				</div>
			{/if}

			<!-- Content -->
			<div class="text-slate-300">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
