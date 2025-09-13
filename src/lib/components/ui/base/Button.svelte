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
		className = '',
		disabled = false,
		children
	} = $props<{
		variant?: Variant;
		size?: Size;
		href?: string;
		icon?: string;
		type?: 'button' | 'submit';
		className?: string;
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

<button {type} class={classes} onclick={handleClick} {disabled}>
	{#if icon}
		<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"
			><path fill="currentColor" d={icon} /></svg
		>
	{/if}
	{@render children?.()}
</button>
