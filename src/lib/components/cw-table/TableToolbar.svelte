<script lang="ts">
	import type { SortDir } from './types';

	let {
		search,
		isMobile,
		virtual,
		pageSize,
		sortKey,
		sortDir,
		hasActiveFilters,
		visibleStart,
		visibleEnd,
		total,
		onSearch,
		onToggleVirtual,
		onSetPageSize,
		onClearAll
	}: {
		search: string;
		isMobile: boolean;
		virtual: boolean;
		pageSize: number;
		sortKey: string;
		sortDir: SortDir;
		hasActiveFilters: boolean;
		visibleStart: number;
		visibleEnd: number;
		total: number;
		onSearch: (value: string) => void;
		onToggleVirtual: () => void;
		onSetPageSize: (size: number) => void;
		onClearAll: () => void;
	} = $props();
</script>

<div
	class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3"
>
	<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
		<label class="hidden text-slate-400 sm:block" for="table-search">Search</label>
		<div class="relative flex-1 sm:flex-none">
			<input
				id="table-search"
				value={search}
				oninput={(event) => onSearch(event.currentTarget.value)}
				class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 shadow-sm outline-none ring-1 ring-slate-800 focus:border-sky-500 focus:ring-sky-500 sm:w-64"
				placeholder="Search rows..."
			/>
			{#if search}
				<button
					class="absolute inset-y-0 right-2 text-slate-400 hover:text-slate-300"
					type="button"
					onclick={() => onSearch('')}
					aria-label="Clear search"
				>
					✕
				</button>
			{/if}
		</div>
	</div>

	<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
		{#if !isMobile}
			<button
				type="button"
				class={`virtual-toggle inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm ${
					virtual
						? 'border-sky-500/70 bg-sky-500/10 text-sky-200'
						: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600'
				}`}
				onclick={onToggleVirtual}
			>
				<span class={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${virtual ? 'bg-sky-400' : 'bg-slate-500'}`}></span>
				<span>{virtual ? 'Virtual' : 'Paged'}</span>
			</button>
		{/if}

		<label class="hidden items-center gap-2 text-slate-400 sm:flex">
			<span>Page size</span>
			<select
				class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
				onchange={(event) => onSetPageSize(Number(event.currentTarget.value))}
				value={pageSize}
			>
				<option value="10">10</option>
				<option value="12">12</option>
				<option value="15">15</option>
				<option value="25">25</option>
				<option value="50">50</option>
			</select>
		</label>

		{#if (sortKey || hasActiveFilters) && !isMobile}
			<div class="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-200 sm:gap-2 sm:text-sm">
				{#if sortKey}
					<span class="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 text-sky-200 sm:px-2">
						{sortKey} {sortDir === 'asc' ? '↑' : '↓'}
					</span>
				{/if}
				{#if hasActiveFilters}
					<span class="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-200 sm:px-2">
						Filtered
					</span>
				{/if}
				<button
					type="button"
					class="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700 sm:px-2"
					onclick={onClearAll}
				>
					Clear
				</button>
			</div>
		{/if}

		<div class="ml-auto text-xs text-slate-400 sm:ml-0 sm:text-sm">
			{visibleStart}–{visibleEnd} of {total}
		</div>
	</div>
</div>
