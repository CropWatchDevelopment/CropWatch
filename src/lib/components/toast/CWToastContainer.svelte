<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import type { Toast, ToastType } from './toast.svelte';
	import { getToastContext } from './toast.svelte';

	interface Props {
		position?:
			| 'top-right'
			| 'top-left'
			| 'top-center'
			| 'bottom-right'
			| 'bottom-left'
			| 'bottom-center';
		maxToasts?: number;
	}

	let { position = 'top-right', maxToasts = 5 }: Props = $props();

	const toastState = getToastContext();

	const visibleToasts = $derived(toastState.toasts.slice(-maxToasts));

	const positionClasses: Record<NonNullable<Props['position']>, string> = {
		'top-right': 'top-4 right-4',
		'top-left': 'top-4 left-4',
		'top-center': 'top-4 left-1/2 -translate-x-1/2',
		'bottom-right': 'bottom-4 right-4',
		'bottom-left': 'bottom-4 left-4',
		'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2'
	};

	const typeConfig: Record<
		ToastType,
		{ bg: string; border: string; icon: string; iconColor: string }
	> = {
		success: {
			bg: 'bg-emerald-900/90',
			border: 'border-emerald-600',
			iconColor: 'text-emerald-400',
			icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		info: {
			bg: 'bg-sky-900/90',
			border: 'border-sky-600',
			iconColor: 'text-sky-400',
			icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		warning: {
			bg: 'bg-amber-900/90',
			border: 'border-amber-600',
			iconColor: 'text-amber-400',
			icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
		},
		error: {
			bg: 'bg-red-900/90',
			border: 'border-red-600',
			iconColor: 'text-red-400',
			icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z'
		},
		neutral: {
			bg: 'bg-slate-800/90',
			border: 'border-slate-600',
			iconColor: 'text-slate-400',
			icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
		}
	};

	function getTransitionParams(pos: NonNullable<Props['position']>) {
		if (pos.includes('right')) return { x: 100 };
		if (pos.includes('left')) return { x: -100 };
		return { y: pos.includes('top') ? -100 : 100 };
	}
</script>

<div class="pointer-events-none fixed z-[100] flex flex-col gap-3 {positionClasses[position]}">
	{#each visibleToasts as toast (toast.id)}
		{@const config = typeConfig[toast.type]}
		<div
			class="pointer-events-auto flex w-80 max-w-sm items-start gap-3 rounded-xl border {config.border} {config.bg} p-4 shadow-xl shadow-black/40 backdrop-blur-sm"
			in:fly={{ ...getTransitionParams(position), duration: 200 }}
			out:fade={{ duration: 150 }}
			role="alert"
		>
			<!-- Icon -->
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-5 w-5 flex-shrink-0 {config.iconColor}"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d={config.icon} />
			</svg>

			<!-- Content -->
			<div class="flex-1 min-w-0">
				{#if toast.title}
					<p class="font-semibold text-slate-100">{toast.title}</p>
				{/if}
				<p class="text-sm text-slate-300 {toast.title ? 'mt-1' : ''}">{toast.message}</p>
			</div>

			<!-- Close Button -->
			{#if toast.dismissible}
				<button
					type="button"
					class="flex-shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
					onclick={() => toastState.dismiss(toast.id)}
					aria-label="Dismiss notification"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-4 w-4"
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
	{/each}
</div>
