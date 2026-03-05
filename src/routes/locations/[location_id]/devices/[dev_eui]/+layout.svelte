<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children: routeContent }: { data: any; children: Snippet } = $props();
</script>

<div class="flex flex-col gap-4">
	{@render routeContent()}
</div>
