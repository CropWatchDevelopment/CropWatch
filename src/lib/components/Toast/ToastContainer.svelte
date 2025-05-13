<script lang="ts">
	import Toast from './Toast.svelte';
	import { getToasts } from '$lib/stores/toast.svelte';
	import { flip } from 'svelte/animate';
	import { cubicOut } from 'svelte/easing';

	let { position = 'top-right' } = $props();
	const toasts = getToasts();
	
	// Configuration for the flip animation
	const flipDuration = 300; // milliseconds
</script>

<!-- Always keep the container in the DOM -->
<div 
	class="toast-container toast-{position}" 
	role="region" 
	aria-label="Notifications"
	class:has-toasts={toasts.length > 0}
>
	{#each toasts as toast (toast.id)}
		<div animate:flip={{ duration: flipDuration, easing: cubicOut }}>
			<Toast {toast} />
		</div>
	{/each}
</div>

<style>
	.toast-container {
		position: fixed;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		padding: 1rem;
		pointer-events: none;
		opacity: 0;
		visibility: hidden;
		transition: opacity 0.2s ease, visibility 0.2s ease;
	}
	
	.toast-container.has-toasts {
		opacity: 1;
		visibility: visible;
	}
	
	/* Ensure the flip animation wrapper doesn't affect toast styling */
	.toast-container > div {
		width: 100%;
		margin-bottom: 0.5rem;
	}
	
	.toast-container > :global(*) {
		pointer-events: auto;
	}
	
	/* Position variants */
	.toast-top-right {
		top: 0;
		right: 0;
		align-items: flex-end;
	}
	
	.toast-top-left {
		top: 0;
		left: 0;
		align-items: flex-start;
	}
	
	.toast-bottom-right {
		bottom: 0;
		right: 0;
		align-items: flex-end;
	}
	
	.toast-bottom-left {
		bottom: 0;
		left: 0;
		align-items: flex-start;
	}
	
	.toast-top-center {
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		align-items: center;
	}
	
	.toast-bottom-center {
		bottom: 0;
		left: 50%;
		transform: translateX(-50%);
		align-items: center;
	}
</style>