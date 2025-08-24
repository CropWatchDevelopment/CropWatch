<script lang="ts">
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import { mdiMagnify, mdiClose } from '@mdi/js';
	import { getDashboardUIStore } from '$lib/stores/DashboardUIStore.svelte';
	import { onMount, onDestroy } from 'svelte';

	const uiStore = getDashboardUIStore();

	// Bind directly to store.search for reactive filtering
	let value = $state(uiStore.search);

	// Sync local value to store
	$effect(() => {
		if (value !== uiStore.search) uiStore.search = value;
	});

	function clear() {
		value = '';
		uiStore.clearSearch();
		// Focus input after clearing
		const el = document.getElementById('dashboard-search-input');
		el?.focus();
	}

	function handleKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && value) {
			clear();
		}
	}

	// Global '/' hotkey to focus / open search
	function globalKey(e: KeyboardEvent) {
		if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) {
			const target = e.target as HTMLElement | null;
			const tag = target?.tagName?.toLowerCase();
			const isEditable = target?.isContentEditable;
			if (tag !== 'input' && tag !== 'textarea' && !isEditable) {
				e.preventDefault();
				const el = document.getElementById('dashboard-search-input');
				el?.focus();
			}
		}
	}

	onMount(() => {
		window.addEventListener('keydown', globalKey, true);
	});
	onDestroy(() => {
		window.removeEventListener('keydown', globalKey, true);
	});
</script>

<div class="dashboard-filter">
	<label for="dashboard-search-input" class="sr-only">Search locations or devices</label>
	<div class="relative" title="Search (Press / to focus, Esc to clear)">
		<Icon
			class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
			path={mdiMagnify}
			size="20"
		/>
		<input
			id="dashboard-search-input"
			type="text"
			placeholder="Search location, sensor, or DevEUI..."
			bind:value
			onkeydown={handleKey}
			autocomplete="off"
			class="search-input pr-10"
		/>
		{#if value}
			<button type="button" class="clear-btn" aria-label="Clear search" onclick={clear}>
				<Icon path={mdiClose} size="16" />
			</button>
		{/if}
	</div>
</div>

<style>
	.dashboard-filter {
		width: 100%;
		max-width: 28rem;
		margin-bottom: 1rem;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 0.75rem 0.625rem 2.5rem;
		font-size: 0.95rem;
		border: 1px solid #d1d5db;
		border-radius: 0.5rem;
		background: #fff;
		color: #111827;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.search-input:focus {
		outline: none;
		border-color: #2563eb;
		box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.3);
	}

	.search-input::placeholder {
		color: #9ca3af;
	}

	:global(.dark) .search-input {
		background: #1f2937;
		border-color: #374151;
		color: #f3f4f6;
	}
	:global(.dark) .search-input:focus {
		border-color: #3b82f6;
	}
	:global(.dark) .search-input::placeholder {
		color: #6b7280;
	}

	.clear-btn {
		position: absolute;
		top: 50%;
		right: 0.5rem;
		transform: translateY(-50%);
		background: transparent;
		border: none;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 0.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.clear-btn:hover {
		color: #111827;
	}
	:global(.dark) .clear-btn:hover {
		color: #f3f4f6;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
