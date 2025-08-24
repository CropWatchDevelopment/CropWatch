<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	let {
		variant = 'fill',
		color = 'primary',
		href = undefined,
		icon = undefined,
		type = 'button',
		className = '',
		children
	} = $props<{
		variant?: 'fill' | 'outline' | 'ghost' | string;
		color?: 'primary' | 'secondary' | string;
		href?: string;
		icon?: string;
		type?: 'button' | 'submit';
		className?: string;
		children?: Snippet;
	}>();
	const base = $derived(
		'inline-flex items-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
	);
	const colorClasses: Record<string, string> = {
		primary:
			'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600',
		secondary:
			'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white'
	};
	const variantClasses: Record<string, string> = {
		fill: '',
		outline: 'bg-transparent border border-current',
		ghost: 'bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700'
	};
	const classes = $derived(
		`${base} ${colorClasses[color] || ''} ${variantClasses[variant] || ''} ${className}`
	);
	function handleClick(e: MouseEvent) {
		if (href) {
			e.preventDefault();
			goto(href);
		}
	}
</script>

<button {type} class={classes} onclick={handleClick}>
	{#if icon}
		<svg viewBox="0 0 24 24" class="h-5 w-5" aria-hidden="true"
			><path fill="currentColor" d={icon} /></svg
		>
	{/if}
	{@render children?.()}
</button>
