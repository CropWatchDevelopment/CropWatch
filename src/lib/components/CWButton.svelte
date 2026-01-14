<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
	type ButtonSize = 'sm' | 'md' | 'lg';

	interface Props extends HTMLButtonAttributes {
		variant?: ButtonVariant;
		size?: ButtonSize;
		loading?: boolean;
		disabled?: boolean;
		fullWidth?: boolean;
		children: Snippet;
	}

	let {
		variant = 'secondary',
		size = 'md',
		loading = false,
		disabled = false,
		fullWidth = false,
		children,
		class: className = '',
		...restProps
	}: Props = $props();

	const isDisabled = $derived(disabled || loading);

	const variantClasses: Record<ButtonVariant, string> = {
		primary:
			'border-sky-600 bg-sky-600/80 text-white hover:border-sky-500 hover:bg-sky-500 focus-visible:ring-sky-400',
		secondary:
			'border-slate-600 bg-slate-700/60 text-slate-200 hover:border-slate-700 hover:bg-slate-800 focus-visible:ring-slate-400',
		danger:
			'border-red-600 bg-red-600/80 text-white hover:border-red-500 hover:bg-red-500 focus-visible:ring-red-400',
		ghost:
			'border-transparent bg-transparent text-slate-300 hover:bg-slate-800 hover:text-slate-100 focus-visible:ring-slate-400'
	};

	const sizeClasses: Record<ButtonSize, string> = {
		sm: 'px-3 py-1.5 text-xs gap-1.5',
		md: 'px-4 py-2 text-sm gap-2',
		lg: 'px-6 py-3 text-base gap-2.5'
	};

	const baseClasses =
		'inline-flex items-center justify-center rounded-xl border font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

	const disabledClasses = 'cursor-not-allowed opacity-50';

	const buttonClasses = $derived(
		[
			baseClasses,
			variantClasses[variant],
			sizeClasses[size],
			fullWidth ? 'w-full' : '',
			isDisabled ? disabledClasses : '',
			className
		]
			.filter(Boolean)
			.join(' ')
	);
</script>

<button class={buttonClasses} disabled={isDisabled} {...restProps}>
	{#if loading}
		<svg
			class="h-4 w-4 animate-spin"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
			></circle>
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
			></path>
		</svg>
	{/if}
	{@render children()}
</button>
