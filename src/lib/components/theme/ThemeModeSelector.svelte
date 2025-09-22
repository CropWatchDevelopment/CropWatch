<script lang="ts">
	import { themeStore, setThemeMode, type ThemeMode } from '$lib/stores/theme';
	import { get } from 'svelte/store';
	let mode: ThemeMode = get(themeStore).mode;
	const options: { value: ThemeMode; label: string }[] = [
		{ value: 'light', label: 'Light' },
		{ value: 'dark', label: 'Dark' },
		{ value: 'system', label: 'System' }
	];
	function apply(m: ThemeMode) {
		setThemeMode(m);
	}
	const unsub = themeStore.subscribe((s) => (mode = s.mode));
	// no onDestroy needed in header (lives for app lifetime), but keep safe cleanup if reused
	import { onDestroy } from 'svelte';
	onDestroy(() => unsub());
</script>

<div class="theme-mode-selector inline-flex items-center" aria-label="Theme mode selector">
	<!-- Segmented control (desktop) -->
	<div
		class="panel hidden items-stretch gap-0 rounded-md border border-gray-300 p-0.5 md:inline-flex dark:border-zinc-600"
	>
		{#each options as opt}
			<button
				type="button"
				aria-pressed={mode === opt.value}
				onclick={() => apply(opt.value)}
				class="relative rounded-sm px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60
          {mode === opt.value
					? 'bg-emerald-600 text-white shadow dark:bg-emerald-500'
					: 'text-gray-600 hover:bg-emerald-500/10 dark:text-gray-300'}"
			>
				{opt.label}
			</button>
		{/each}
	</div>
	<!-- Compact select (mobile) -->
	<select
		class="ml-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs md:hidden dark:border-zinc-600 dark:bg-zinc-700"
		bind:value={mode}
		onchange={(e) => apply((e.target as HTMLSelectElement).value as ThemeMode)}
		aria-label="Theme mode"
	>
		{#each options as opt}
			<option value={opt.value}>{opt.label}</option>
		{/each}
	</select>
</div>

<style>
	.theme-mode-selector button + button {
		margin-left: 2px;
	}
</style>
