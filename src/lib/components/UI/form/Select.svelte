<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		name?: string;
		value?: string | number | undefined;
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
	class="border-border bg-surface text-text focus:border-primary focus:ring-primary min-h-10 rounded-md border px-3 py-2 text-sm shadow-sm transition focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 {className}"
	style="background-color: var(--color-surface); color: var(--color-text);"
	{onchange}
	{...rest}
>
	{@render children?.()}
</select>
