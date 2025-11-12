<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		name?: string;
		value?: string;
		disabled?: boolean;
		class?: string;
		onchange?: (event: Event) => void;
		children?: Snippet;
	};

	let {
		name = undefined,
		value = $bindable(),
		disabled = false,
		class: className = '',
		onchange,
		children,
		...rest
	}: Props & Record<string, any> = $props();
</script>

<select
	{name}
	{disabled}
	bind:value
	class="min-h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[var(--color-border)] dark:bg-[var(--color-foreground-dark)] dark:text-[var(--color-text)] {className}"
	{onchange}
	{...rest}
>
	{@render children?.()}
</select>
