<script lang="ts">
	type Props = {
		type?: 'text' | 'password' | 'email' | 'number' | 'date';
		name?: string;
		value?: string | number | undefined;
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
	class="border-border bg-surface text-text focus:border-primary focus:ring-primary min-h-10 rounded-md border px-3 py-2 text-sm shadow-sm transition focus:ring-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 {className}"
	{...rest}
/>
