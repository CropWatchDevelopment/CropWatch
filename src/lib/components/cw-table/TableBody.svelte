<script lang="ts">
	import type { Snippet } from 'svelte';
	import TableDataRow from './TableDataRow.svelte';
	import type { CellSnippet, ColumnConfig, TableContext } from './types';

	let {
		total,
		empty = undefined,
		columns,
		actions = undefined,
		row = undefined,
		rowsToRender,
		rowBaseIndex,
		rowKey,
		tableContext,
		cell = undefined,
		virtual,
		topSpacer,
		bottomSpacer,
		rowHeight,
		rowMaxHeight
	}: {
		total: number;
		empty?: Snippet;
		columns: ColumnConfig[];
		actions?: Snippet<[unknown, number, TableContext]>;
		row?: Snippet<[unknown, number, TableContext]>;
		rowsToRender: unknown[];
		rowBaseIndex: number;
		rowKey: (item: unknown, absoluteIndex: number) => string;
		tableContext: TableContext;
		cell?: CellSnippet;
		virtual: boolean;
		topSpacer: number;
		bottomSpacer: number;
		rowHeight: number;
		rowMaxHeight: number;
	} = $props();

	const colspan = $derived(actions ? columns.length + 1 : columns.length || 1);
</script>

<tbody>
	{#if total === 0}
		{#if empty}
			{@render empty()}
		{:else}
			<tr>
				<td colspan={colspan} class="px-4 py-10 text-center text-sm text-slate-400">
					No results match the current filters.
				</td>
			</tr>
		{/if}
	{:else}
		{#if virtual && topSpacer > 0}
			<tr class="spacer-row" aria-hidden="true" style={`height:${topSpacer}px`}></tr>
		{/if}

		{#if row}
			{#each rowsToRender as item, idx (rowKey(item, rowBaseIndex + idx))}
				{@render row(item, rowBaseIndex + idx, tableContext)}
			{/each}
		{:else}
			{#each rowsToRender as item, idx (rowKey(item, rowBaseIndex + idx))}
				<TableDataRow
					{item}
					index={rowBaseIndex + idx}
					{columns}
					{actions}
					{tableContext}
					{cell}
					{virtual}
					{rowHeight}
					{rowMaxHeight}
				/>
			{/each}
		{/if}

		{#if virtual && bottomSpacer > 0}
			<tr class="spacer-row" aria-hidden="true" style={`height:${bottomSpacer}px`}></tr>
		{/if}
	{/if}
</tbody>
