<script lang="ts">
	import type { Snippet } from 'svelte';
	import { alignClass } from './helpers';
	import TableCell from './TableCell.svelte';
	import type { CellSnippet, ColumnConfig, TableContext } from './types';

	let {
		item,
		index,
		columns,
		actions = undefined,
		tableContext,
		cell = undefined,
		virtual = false,
		rowHeight = 52,
		rowMaxHeight = 64
	}: {
		item: unknown;
		index: number;
		columns: ColumnConfig[];
		actions?: Snippet<[unknown, number, TableContext]>;
		tableContext: TableContext;
		cell?: CellSnippet;
		virtual?: boolean;
		rowHeight?: number;
		rowMaxHeight?: number;
	} = $props();

	const rowStyle = $derived(
		virtual ? `height:${rowHeight}px` : `max-height:${rowMaxHeight}px; height:auto;`
	);
	const rowClass = $derived(
		virtual
			? 'border-t border-slate-900/80 even:bg-slate-800/40 hover:bg-blue-800/70'
			: 'border-t border-slate-900/80 odd:bg-slate-700/40 even:bg-slate-800/50 hover:bg-blue-800/70 overflow-hidden'
	);
</script>

<tr style={rowStyle} class={rowClass}>
	{#if columns.length}
		{#each columns as col (col.key)}
			<td
				class={`px-2 md:px-3 py-2 align-middle ${alignClass(col.align)} ${col.cellClass ?? ''}`}
				style={col.width ?? ''}
				data-label={col.label}
			>
				<TableCell {item} {col} {cell} />
			</td>
		{/each}
		{#if actions}
			<td class="whitespace-nowrap px-2 md:px-3 py-2 align-middle text-right" data-label="Actions">
				{@render actions(item, index, tableContext)}
			</td>
		{/if}
	{:else}
		<td class="px-2 md:px-3 py-2 text-slate-200">
			<pre class="text-xs text-slate-400">{JSON.stringify(item, null, 2)}</pre>
		</td>
	{/if}
</tr>
