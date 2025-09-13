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
	// Map legacy variant names to unified variants
	const variantMap: Record<string, string> = {
		primary: 'primary',
		secondary: 'secondary',
		tertiary: 'secondary',
		danger: 'danger',
		ghost: 'ghost'
	};
</script>

<BaseButton
	{type}
	variant={variantMap[variant] as any}
	{size}
	{className}
	{href}
	{disabled}
	on:click={(e: CustomEvent<MouseEvent>) => onclick?.(e.detail)}
>
	{@render children?.()}
</BaseButton>

<style lang="postcss">
	/* Wrapper keeps backward compat class hooks if used */
</style>
