<script lang="ts">
	import type { Snippet } from 'svelte';
	import { alignClass } from './helpers';
	import type { ColumnConfig, SortDir, TableContext } from './types';

	let {
		header = undefined,
		columns,
		actions = undefined,
		tableContext,
		sortKey,
		sortDir,
		openColumn,
		pendingSortDir,
		pendingColumnFilters,
		columnHasFilter,
		sortIcon,
		onOpenColumn,
		onCloseDropdown,
		onSetPendingSortDir,
		onToggleOption,
		onApplyPending,
		onSavePending
	}: {
		header?: Snippet<[TableContext]>;
		columns: ColumnConfig[];
		actions?: Snippet<[unknown, number, TableContext]>;
		tableContext: TableContext;
		sortKey: string;
		sortDir: SortDir;
		openColumn: string | null;
		pendingSortDir: SortDir;
		pendingColumnFilters: Record<string, string[]>;
		columnHasFilter: (colKey: string) => boolean;
		sortIcon: (key: string) => string;
		onOpenColumn: (colKey: string) => void;
		onCloseDropdown: () => void;
		onSetPendingSortDir: (colKey: string, dir: SortDir) => void;
		onToggleOption: (colKey: string, value: string) => void;
		onApplyPending: () => void;
		onSavePending: () => void;
	} = $props();
</script>

<thead class="sticky top-0 bg-slate-900/90 text-slate-300 backdrop-blur">
	{#if header}
		{@render header(tableContext)}
	{:else if columns.length}
		<tr class="border-b border-slate-800 text-xs uppercase tracking-wide md:text-sm">
			{#each columns as col (col.key)}
				<th class={`relative px-2 py-2 md:px-3 ${alignClass(col.align)}`} style={col.width ?? ''}>
					<button
						class="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-slate-800/80"
						onclick={() => {
							if (openColumn === col.key) {
								onCloseDropdown();
							} else {
								onOpenColumn(col.key);
							}
						}}
					>
						<span>{col.label}</span>
						{#if col.sortable !== false}
							<span class={col.key === sortKey ? 'text-sky-300' : ''}>{sortIcon(col.key)}</span>
						{/if}
						{#if col.filter}
							<span class={`text-slate-400 ${columnHasFilter(col.key) ? 'text-amber-300' : ''}`}>▾</span>
						{/if}
					</button>

					{#if openColumn === col.key}
						<div class="absolute left-0 z-30 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[12px] shadow-xl ring-1 ring-slate-800">
							<div class="mb-2 text-[11px] font-semibold uppercase text-slate-400">Sort order</div>
							<div class="mb-3 space-y-1">
								<label class="flex items-center gap-2 text-slate-200">
									<input
										type="radio"
										name={`sort-${col.key}`}
										value="asc"
										checked={pendingSortDir === 'asc'}
										onchange={() => onSetPendingSortDir(col.key, 'asc')}
									/>
									<span>Ascending</span>
								</label>
								<label class="flex items-center gap-2 text-slate-200">
									<input
										type="radio"
										name={`sort-${col.key}`}
										value="desc"
										checked={pendingSortDir === 'desc'}
										onchange={() => onSetPendingSortDir(col.key, 'desc')}
									/>
									<span>Descending</span>
								</label>
							</div>

							{#if col.filter?.type === 'checkbox'}
								<div class="mb-2 text-[11px] font-semibold uppercase text-slate-400">Types</div>
								<div class="space-y-1">
									{#each col.filter.options as opt (opt.value)}
										<label class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-slate-800/70">
											<div class="flex items-center gap-2">
												<input
													type="checkbox"
													checked={pendingColumnFilters[col.key]?.includes(opt.value)}
													onchange={() => onToggleOption(col.key, opt.value)}
												/>
												<span class="capitalize text-slate-100">{opt.label ?? opt.value}</span>
											</div>
										</label>
									{/each}
								</div>
							{/if}

							<div class="mt-3 flex items-center justify-end gap-2 border-t border-slate-800 pt-3 text-[11px]">
								<button
									class="rounded-md bg-slate-800 px-3 py-1 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
									onclick={onApplyPending}
								>
									OK
								</button>
								<button
									class="rounded-md bg-sky-600 px-3 py-1 text-slate-950 ring-1 ring-sky-500 hover:bg-sky-500"
									onclick={onSavePending}
								>
									SAVE
								</button>
								<button
									class="rounded-md bg-slate-800 px-3 py-1 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
									onclick={onCloseDropdown}
								>
									Close
								</button>
							</div>
						</div>
					{/if}
				</th>
			{/each}
			{#if actions}
				<th class="px-2 py-2 text-right md:px-3">Actions</th>
			{/if}
		</tr>
	{:else}
		<tr class="border-b border-slate-800 text-[11px] uppercase tracking-wide">
			<th class="px-3 py-2 text-left">Items</th>
			{#if actions}
				<th class="px-3 py-2 text-right">Actions</th>
			{/if}
		</tr>
	{/if}
</thead>
