<script lang="ts">
	type Props = {
		type?: 'text' | 'password' | 'email' | 'number' | 'date';
		name?: string;
		value?: string | number;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
	};

	let {
		type = 'text',
		name = undefined,
		value = $bindable(),
		placeholder = undefined,
		disabled = false,
		class: className = '',
		...rest
	}: Props & Record<string, any> = $props();
</script>

<input
	{type}
	{name}
	bind:value
	{placeholder}
	{disabled}
	class="rounded border border-gray-300 bg-white p-2 text-gray-900 text-inherit dark:border-zinc-700 dark:bg-zinc-800 dark:text-white {className}"
	{...rest}
/>
