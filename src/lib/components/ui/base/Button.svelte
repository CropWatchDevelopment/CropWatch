<script lang="ts">
	import { goto } from '$app/navigation';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher<{ click: MouseEvent }>();
	import type { Snippet } from 'svelte';
	type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger';
	type Size = 'sm' | 'md' | 'lg';
	let {
		variant = 'primary' as Variant,
		size = 'md' as Size,
		href = undefined,
		icon = undefined,
		type = 'button',
		form = undefined,
		className = '',
		loading = false,
		disabled = false,
		children
	} = $props<{
		variant?: Variant;
		size?: Size;
		href?: string;
		icon?: string;
		type?: 'button' | 'submit';
		form?: string;
		className?: string;
		loading?: boolean;
		disabled?: boolean;
		children?: Snippet;
	}>();

	const sizeClasses: Record<Size, string> = {
		sm: 'text-xs px-2 py-1',
		md: 'text-sm px-4 py-2',
		lg: 'text-base px-6 py-3'
	};
	const variantMap: Record<Variant, string> = {
		primary: 'btn-base btn-primary text-white',
		secondary: 'btn-base btn-secondary',
		ghost:
			'btn-base btn-ghost text-inherit hover:bg-foreground-light/60 dark:hover:bg-foreground-light/20',
		outline: 'btn-base btn-outline',
		danger: 'btn-base bg-red-600 hover:bg-red-700 text-white'
	};
	const classes = $derived(
		`${variantMap[variant as Variant]} ${sizeClasses[size as Size]} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`
	);
	function handleClick(e: MouseEvent) {
		if (disabled) {
			e.preventDefault();
			return;
		}
		if (href) {
			e.preventDefault();
			if (href.startsWith('/')) goto(href);
			else window.location.href = href;
		}
		dispatch('click', e);
	}
</script>

<button
	{type}
	{form}
	class={`inline-flex items-center justify-center gap-2 px-4 py-2 ${classes}`}
	onclick={handleClick}
	{disabled}
>
	{#if icon}
		<svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" aria-hidden="true">
			<path fill="currentColor" d={icon} />
		</svg>
	{/if}

	{#if loading}
		<svg
			class="h-5 w-5 shrink-0 animate-spin text-white"
			xmlns="http://www.w3.org/2000/svg"
			fill="none"
			viewBox="0 0 24 24"
		>
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
			<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
		</svg>
	{/if}

	{@render children?.()}
</button>
