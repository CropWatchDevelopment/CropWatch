<script lang="ts">
	import { globalLoading } from '$lib/stores/loadingStore';
	import Spinner from './Spinner.svelte';
</script>

{#if $globalLoading}
	<div class="global-loading-overlay">
		<div class="loading-content">
			<Spinner />
			<p>Loading...</p>
		</div>
	</div>
{/if}

<style>
	.global-loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 9999;
		backdrop-filter: blur(3px);
	}

	.loading-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		color: white;
		background-color: rgba(0, 0, 0, 0.5);
		padding: 2rem;
		border-radius: 0.5rem;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}

	.loading-content :global(svg) {
		width: 60px;
		height: 60px;
		margin-bottom: 1rem;
	}

	p {
		font-size: 1.2rem;
		margin: 0;
	}
</style>
