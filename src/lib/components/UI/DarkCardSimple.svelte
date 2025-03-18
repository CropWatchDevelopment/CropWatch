<script lang="ts">
	let { children } = $props();
</script>

<div class="my-3 rounded-xl bg-secondary-50 bg-opacity-50 p-3 text-surface-100">
	{@render children()}
</div>
