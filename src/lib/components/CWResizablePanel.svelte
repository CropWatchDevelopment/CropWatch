<script lang="ts">
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';

	interface Props {
		open?: boolean;
		minHeight?: number;
		maxHeight?: number;
		defaultHeight?: number;
		title?: string;
		children: Snippet;
	}

	let {
		open = $bindable(false),
		minHeight = 150,
		maxHeight = 500,
		defaultHeight = 250,
		title = 'Panel',
		children
	}: Props = $props();

	let panelHeight = $state(defaultHeight);
	let isDragging = $state(false);
	let startY = $state(0);
	let startHeight = $state(0);

	function handleMouseDown(e: MouseEvent) {
		isDragging = true;
		startY = e.clientY;
		startHeight = panelHeight;
		document.body.style.cursor = 'ns-resize';
		document.body.style.userSelect = 'none';
	}

	function handleMouseMove(e: MouseEvent) {
		if (!isDragging) return;
		const delta = startY - e.clientY;
		const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
		panelHeight = newHeight;
	}

	function handleMouseUp() {
		if (isDragging) {
			isDragging = false;
			document.body.style.cursor = '';
			document.body.style.userSelect = '';
		}
	}

	function handleTouchStart(e: TouchEvent) {
		const touch = e.touches[0];
		isDragging = true;
		startY = touch.clientY;
		startHeight = panelHeight;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isDragging) return;
		const touch = e.touches[0];
		const delta = startY - touch.clientY;
		const newHeight = Math.min(maxHeight, Math.max(minHeight, startHeight + delta));
		panelHeight = newHeight;
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	$effect(() => {
		if (isDragging) {
			window.addEventListener('mousemove', handleMouseMove);
			window.addEventListener('mouseup', handleMouseUp);
			window.addEventListener('touchmove', handleTouchMove);
			window.addEventListener('touchend', handleTouchEnd);
		}
		return () => {
			window.removeEventListener('mousemove', handleMouseMove);
			window.removeEventListener('mouseup', handleMouseUp);
			window.removeEventListener('touchmove', handleTouchMove);
			window.removeEventListener('touchend', handleTouchEnd);
		};
	});
</script>

{#if open}
	<div
		class="flex flex-col overflow-hidden rounded-t-xl border border-b-0 border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur-sm"
		style="height: {panelHeight}px;"
		transition:slide={{ duration: 200 }}
	>
		<!-- Drag handle / Header -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="group flex flex-none cursor-ns-resize select-none items-center justify-between border-b border-slate-800 bg-slate-900 px-4 py-2"
			onmousedown={handleMouseDown}
			ontouchstart={handleTouchStart}
			role="slider"
			aria-orientation="vertical"
			aria-valuenow={panelHeight}
			aria-valuemin={minHeight}
			aria-valuemax={maxHeight}
			aria-label="Resize panel"
			tabindex="-1"
		>
			<!-- Drag indicator -->
			<div class="flex items-center gap-3">
				<div class="flex flex-col items-center gap-0.5">
					<div class="h-0.5 w-8 rounded-full bg-slate-600 transition-colors group-hover:bg-slate-500"></div>
					<div class="h-0.5 w-8 rounded-full bg-slate-600 transition-colors group-hover:bg-slate-500"></div>
				</div>
				<span class="text-xs font-medium text-slate-400">{title}</span>
			</div>

			<div class="flex items-center gap-2">
				<!-- Height indicator on drag -->
				{#if isDragging}
					<span class="text-[10px] tabular-nums text-slate-400">{panelHeight}px</span>
				{/if}
				
				<!-- Close button -->
				<button
					type="button"
					class="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
					onclick={() => (open = false)}
					onmousedown={(e) => e.stopPropagation()}
					aria-label="Collapse panel"
				>
					<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-auto p-4">
			{@render children()}
		</div>
	</div>
{/if}
