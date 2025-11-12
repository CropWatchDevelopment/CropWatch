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
	class="min-h-10 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-[var(--color-text)] shadow-sm transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[var(--color-border)] dark:bg-[var(--color-foreground-dark)] dark:text-[var(--color-text)] {className}"
	{...rest}
/>
