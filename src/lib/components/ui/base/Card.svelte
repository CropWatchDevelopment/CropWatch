<script lang="ts">
	import type { Snippet } from 'svelte';
	let { className = '', children } = $props<{ className?: string; children?: Snippet }>();
</script>

<div
	class={`rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
>
	{@render children?.()}
</div>
