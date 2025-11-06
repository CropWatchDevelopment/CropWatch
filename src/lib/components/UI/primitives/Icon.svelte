<script lang="ts">
	// Lightweight Icon component replacing svelte-ux Icon
	interface Props {
		path?: string;
		data?: string;
		size?: string | number;
		class?: string;
		ariaLabel?: string;
	}
	let {
		path = undefined,
		data = undefined,
		size = '1em',
		class: className = '',
		ariaLabel
	}: Props = $props();
	let d = $derived(path || data || '');
	let width = $derived(typeof size === 'number' ? `${size}px` : size);
	let height = $derived(width);
</script>

<svg
	role="img"
	aria-label={ariaLabel}
	aria-hidden={ariaLabel ? undefined : true}
	viewBox="0 0 24 24"
	{width}
	{height}
	class={className}
	fill="currentColor"
>
	{#if d}
		<path {d} />
	{/if}
</svg>
