<script lang="ts">
	import { Icon } from 'svelte-ux';
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
	class="flex h-full w-full flex-col overflow-hidden rounded-xl border border-gray-200 border-gray-200 bg-white text-gray-900 shadow-md
	dark:border-gray-700 dark:bg-[#1f2532] dark:text-white dark:shadow-gray-900/20"
>
	<div
		class="relative min-h-[130px] bg-gray-100
		text-yellow-600 dark:bg-[#2c3546] dark:text-yellow-300"
	>
		<div class="pt-12">
			<!-- Icon-only status indicator with color based on state -->
			<div class="absolute top-3 left-3 flex h-10 w-10 items-center justify-center">
				{#if loading}
					<Icon class="text-xl text-blue-400" path={mdiClockOutline} />
				{:else if allActive}
					<Icon class="text-xl text-green-500" path={mdiCheck} />
				{:else if activeDevices.length > 0 && !allInactive}
					<Icon class="text-xl text-orange-400" path={mdiAlert} />
				{:else}
					<Icon class="text-xl text-red-500" path={mdiClose} />
				{/if}
			</div>
		</div>

		<h2
			class="flex items-center justify-between px-2 py-3 text-lg font-semibold text-yellow-600 dark:text-yellow-400"
		>
			<span>{location.name}</span>
			<button
				class="ml-2 inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 p-0 text-blue-700 transition-colors duration-200 hover:bg-blue-100 dark:border-gray-600 dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-gray-600"
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
		</h2>
	</div>

	<div class="px-2 py-2">
		<div class="flex w-full flex-col items-start gap-1">
			{#if content}
				{@render content()}
			{/if}
		</div>
	</div>
</div>
