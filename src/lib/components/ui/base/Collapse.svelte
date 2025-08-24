<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Snippet } from 'svelte';
	let {
		open = false,
		classes = {} as { root?: string; icon?: string },
		trigger,
		children
	} = $props<{
		open?: boolean;
		classes?: { root?: string; icon?: string };
		trigger?: Snippet;
		children?: Snippet;
	}>();
	const dispatch = createEventDispatcher();
	function toggle() {
		open = !open;
		dispatch('change', { open });
	}
	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			toggle();
		}
	}
</script>

<div class={classes.root ?? ''} data-open={open}>
	<div role="button" tabindex="0" onclick={toggle} onkeydown={handleKey}>
		{@render trigger?.()}
	</div>
	{#if open}
		<div class="pt-2">{@render children?.()}</div>
	{/if}
</div>
