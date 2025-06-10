<script lang="ts">
	// Svelte 5 syntax - using $props and custom events
	interface Props {
		count: number;
		onchange?: (count: number) => void;
	}
	
	let { count = $bindable(), onchange }: Props = $props();
	
	function addValue(delta: number) {
		count += delta;
		onchange?.(count);
	}
</script>

<style>
	button {
		width: 2rem
	}
</style>

<div>
	<button onclick={() => addValue(-1)}>
		-
	</button>
	<button onclick={() => addValue(1)}>
		+
	</button>	
</div>

<div style="width:100%;text-align:center;font-weight:600">
	{count}
</div>
