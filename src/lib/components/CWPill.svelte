<script lang="ts">
	import type { Snippet } from 'svelte';

	type PillPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
	type PillColor = 'success' | 'warning' | 'error' | 'info' | 'neutral';

	interface Props {
		position?: PillPosition;
		color?: PillColor;
		value?: number | string;
		showZero?: boolean;
		max?: number;
		pulse?: boolean;
		children: Snippet;
	}

	let {
		position = 'top-right',
		color = 'neutral',
		value,
		showZero = false,
		max = 99,
		pulse = false,
		children
	}: Props = $props();

	const shouldShow = $derived(
		value !== undefined && (showZero || (typeof value === 'number' ? value > 0 : value !== '0'))
	);

	const displayValue = $derived.by(() => {
		if (typeof value === 'number' && max && value > max) {
			return `${max}+`;
		}
		return value;
	});

	const positionClasses: Record<PillPosition, string> = {
		'top-left': '-top-1.5 -left-1.5',
		'top-right': '-top-1.5 -right-1.5',
		'bottom-left': '-bottom-1.5 -left-1.5',
		'bottom-right': '-bottom-1.5 -right-1.5'
	};

	const colorClasses: Record<PillColor, string> = {
		success: 'bg-emerald-500 text-white ring-emerald-400/30',
		warning: 'bg-amber-500 text-white ring-amber-400/30',
		error: 'bg-red-500 text-white ring-red-400/30',
		info: 'bg-sky-500 text-white ring-sky-400/30',
		neutral: 'bg-slate-600 text-slate-100 ring-slate-500/30'
	};
</script>

<div class="relative inline-flex">
	{@render children()}
	
	{#if shouldShow}
		<span
			class="absolute flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ring-2 {positionClasses[position]} {colorClasses[color]}"
		>
			{#if pulse}
				<span class="absolute inset-0 animate-ping rounded-full {colorClasses[color]} opacity-40"></span>
			{/if}
			<span class="relative">{displayValue}</span>
		</span>
	{/if}
</div>
