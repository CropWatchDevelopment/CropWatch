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
	class="rounded border border-gray-300 bg-white p-2 text-gray-900 text-inherit dark:border-zinc-700 dark:bg-zinc-800 dark:text-white {className}"
	{onchange}
	{...rest}
>
	{@render children?.()}
</select>
