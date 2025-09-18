<script lang="ts">
	import BaseButton from '$lib/components/ui/base/Button.svelte';
	import type { Snippet } from 'svelte';

	type LegacyVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';

	let {
		type = 'button',
		variant = 'primary' as LegacyVariant,
		size = 'md',
		class: className = '',
		href = undefined,
		disabled = false,
		loading = false,
		children,
		onclick
	} = $props<{
		type?: 'button' | 'submit' | 'reset';
		variant?: LegacyVariant;
		size?: 'sm' | 'md' | 'lg';
		class?: string;
		href?: string;
		disabled?: boolean;
		loading?: boolean;
		children?: Snippet;
		onclick?: (e: MouseEvent) => void;
	}>();

	// Simplified variant mapping: tertiary maps to secondary for consistency
	const mappedVariant = variant === 'tertiary' ? 'secondary' : variant;
</script>

<BaseButton
	{type}
	variant={mappedVariant}
	{size}
	{className}
	{href}
	{disabled}
	{loading}
	on:click={(e: CustomEvent<MouseEvent>) => onclick?.(e.detail)}
>
	{@render children?.()}
</BaseButton>
