<script lang="ts">
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';

	type Props = {
		type?: 'button' | 'submit' | 'reset';
		variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		href?: string | undefined;
		disabled?: boolean;
		children?: Snippet;
		onclick?: () => void;
	};

	let {
		type = 'button',
		variant = 'primary',
		size = 'md',
		class: className = '',
		href = undefined,
		disabled = false,
		children = undefined,
		onclick = undefined,
		...rest
	}: Props & Record<string, any> = $props();

	const colors = {
		primary: 'green',
		secondary: 'gray',
		tertiary: 'neutral',
		danger: 'red'
	};

	const color = $derived(colors[variant]);

	// Theme colors for different variants: we need to keep this list, otherwise dynamic class names
	// won’t work with Tailwind:
	// - bg-green-700 hover:bg-green-700/90 active:bg-green-700/95
	// - bg-gray-700 hover:bg-gray-700/90 active:bg-gray-700/95
	// - bg-neutral-700 hover:bg-neutral-700/90 active:bg-neutral-700/95
	// - bg-red-700 hover:bg-red-700/90 active:bg-red-700/95
</script>

<button
	{type}
	{disabled}
	class="focus-visible:ring-ring bg-{color}-700 text-white hover:bg-{color}-700/90 active:bg-{color}-700/95 inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-nowrap shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:cursor-default disabled:opacity-50 {className}"
	onclick={() => {
		if (disabled) return;

		if (href) {
			if (href.startsWith('/')) {
				goto(href);
			} else {
				window.location.href = href;
			}
		} else {
			onclick?.();
		}
	}}
	{...rest}
>
	{@render children?.()}
</button>
