<script lang="ts">
	let {
		path = undefined,
		data = undefined,
		size = '1em',
		className = '',
		class: externalClass = ''
	} = $props<{
		path?: string;
		data?: string;
		size?: string | number;
		className?: string;
		class?: string;
	}>();
	let el: SVGSVGElement;
	const resolved = $derived(path || data || '');
	const pixelSize = $derived(typeof size === 'number' ? `${size}px` : size);
	const mergedClass = $derived(
		[className, externalClass]
			.map((c) => c?.trim())
			.filter(Boolean)
			.join(' ')
	);
</script>

<svg
	bind:this={el}
	viewBox="0 0 24 24"
	class={mergedClass}
	style={`width:${pixelSize};height:${pixelSize};display:inline-block;`}
	aria-hidden="true"
>
	<path fill="currentColor" d={resolved} />
</svg>
