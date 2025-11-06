<script lang="ts">
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import { goto } from '$app/navigation';
	import { mdiAlert, mdiCheck, mdiClose, mdiClockOutline } from '@mdi/js';
	import type { Location } from '$lib/models/Location';
	import type { Snippet } from 'svelte';

	let {
		location,
		href,
		content = undefined,
		activeDevices = [],
		allActive = false,
		allInactive = false,
		loading = false
	} = $props<{
		location: Location;
		href: string;
		content?: Snippet;
		activeDevices?: any[];
		allActive?: boolean;
		allInactive?: boolean;
		loading?: boolean;
	}>();
</script>

<div
	class="surface-card flex h-full w-full flex-col overflow-hidden rounded-lg border border-[var(--color-border)] text-[var(--color-text)] shadow-sm"
>
	<div
		class="flex items-center justify-between border-b border-[var(--color-border)] bg-gradient-to-r from-[var(--color-surface)] to-transparent px-4 py-3"
	>
		<div class="flex items-center gap-3">
			<span class="bg-accent flex h-10 w-10 items-center justify-center rounded-full">
				{#if loading}
					<Icon class="text-blue-500" path={mdiClockOutline} />
				{:else if allActive}
					<Icon class="text-emerald-500" path={mdiCheck} />
				{:else if activeDevices.length > 0 && !allInactive}
					<Icon class="text-amber-400" path={mdiAlert} />
				{:else}
					<Icon class="text-rose-500" path={mdiClose} />
				{/if}
			</span>
			<h2 class="text-base leading-tight font-semibold text-gray-900 dark:text-gray-100">
				{location.name}
			</h2>
		</div>
		<button
			class="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-surface-emphasis)] text-gray-700 transition-colors duration-200 hover:bg-[var(--color-primary)]/10 hover:text-[var(--color-primary)] dark:text-gray-300"
			onclick={() => goto(href)}
			aria-label="View details"
		>
			<svg viewBox="0 0 24 24" class="pointer-events-none h-5 w-5">
				<path
					fill="currentColor"
					d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"
				/>
			</svg>
		</button>
	</div>

	<div class="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
		{#if content}
			{@render content()}
		{/if}
	</div>
</div>
