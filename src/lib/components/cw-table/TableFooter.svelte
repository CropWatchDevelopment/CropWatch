<script lang="ts">
	let {
		page,
		pageCount,
		virtual,
		isMobile,
		visibleStart,
		visibleEnd,
		total,
		onPrevPage,
		onNextPage
	}: {
		page: number;
		pageCount: number;
		virtual: boolean;
		isMobile: boolean;
		visibleStart: number;
		visibleEnd: number;
		total: number;
		onPrevPage: () => void;
		onNextPage: () => void;
	} = $props();
</script>

<div class="mt-auto flex flex-col gap-3 border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-slate-200 sm:flex-row sm:items-center sm:justify-between sm:text-sm">
	<div class="flex items-center justify-center gap-2 sm:justify-start">
		<button
			type="button"
			class="rounded-md bg-slate-900 px-3 py-1.5 text-slate-200 ring-1 ring-slate-700 transition enabled:hover:bg-slate-800 disabled:opacity-50"
			onclick={onPrevPage}
			disabled={page === 1 || virtual}
		>
			Prev
		</button>
		<span class="text-slate-400">Page {page} of {pageCount}</span>
		<button
			type="button"
			class="rounded-md bg-slate-900 px-3 py-1.5 text-slate-200 ring-1 ring-slate-700 transition enabled:hover:bg-slate-800 disabled:opacity-50"
			onclick={onNextPage}
			disabled={page === pageCount || virtual}
		>
			Next
		</button>
	</div>

	<div class="text-center text-[11px] text-slate-400 sm:text-right">
		{#if isMobile}
			<span>Showing {visibleStart}–{visibleEnd} of {total}</span>
		{:else if virtual}
			<span>Virtualized list • {total} rows</span>
		{:else}
			<span>Rows {visibleStart}–{visibleEnd} of {total}</span>
		{/if}
	</div>
</div>
