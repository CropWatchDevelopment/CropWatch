<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<div class="device-route-layout">
	{@render children()}
</div>

<style>
	.device-route-layout {
		display: flex;
		flex: 1 1 auto;
		flex-direction: column;
		min-width: 0;
		min-height: 0;
		overflow-y: auto;
	}
</style>
