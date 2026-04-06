<script lang="ts">
	import type { ClassValue, SvelteHTMLElements } from 'svelte/elements';

	type IconHostAttributes = SvelteHTMLElements['span'];

	interface Props extends IconHostAttributes {
		src: string;
		alt?: string;
		class?: ClassValue;
		style?: string;
		preserveColor?: boolean;
	}

	let {
		src,
		alt = '',
		class: className,
		style: styleValue,
		preserveColor = false,
		...rest
	}: Props = $props();

	function buildStyle() {
		if (preserveColor) return styleValue;

		const maskStyle = `--cw-icon-src: url("${src}");`;
		return styleValue ? `${styleValue}; ${maskStyle}` : maskStyle;
	}
</script>

{#if preserveColor}
	<img {...rest} {src} {alt} class={['cw-icon', className]} style={styleValue} />
{:else}
	<span
		{...rest}
		class={['cw-icon', className]}
		role={alt ? 'img' : undefined}
		aria-label={alt || undefined}
		aria-hidden={alt ? undefined : true}
		style={buildStyle()}
	></span>
{/if}

<style>
	.cw-icon {
		display: inline-block;
		inline-size: 1.5rem;
		block-size: 1.5rem;
		flex: none;
		vertical-align: middle;
	}

	span.cw-icon {
		background-color: currentColor;
		-webkit-mask: var(--cw-icon-src) center / contain no-repeat;
		mask: var(--cw-icon-src) center / contain no-repeat;
	}

	img.cw-icon {
		object-fit: contain;
	}
</style>
