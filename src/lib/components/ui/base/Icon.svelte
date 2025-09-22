<script lang="ts">
	let {
		path = undefined,
		data = undefined,
		size = '1em',
		className = ''
	} = $props<{
		path?: string;
		data?: string;
		size?: string | number;
		className?: string;
	}>();
	let el: SVGSVGElement;
	const resolved = $derived(path || data || '');
	const pixelSize = $derived(typeof size === 'number' ? `${size}px` : size);
</script>

<svg
	bind:this={el}
	viewBox="0 0 24 24"
	class={className}
	style={`width:${pixelSize};height:${pixelSize};display:inline-block;`}
	aria-hidden="true"
>
	<path fill="currentColor" d={resolved} />
</svg>
