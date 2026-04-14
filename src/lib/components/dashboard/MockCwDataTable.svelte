<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props {
		loadData: (query: {
			page: number;
			pageSize: number;
			search: string;
			sort: { column: string; direction: 'asc' | 'desc' } | null;
			filters: Record<string, string[]>;
			signal: AbortSignal;
		}) => Promise<{ rows: Record<string, unknown>[]; total?: number }>;
		pageSize?: number;
		filters?: Record<string, string[]>;
		actionsHeader?: Snippet;
		rowActions?: Snippet<[Record<string, unknown>]>;
		emptyState?: Snippet;
		errorState?: Snippet<[string]>;
		onRefresh?: () => void | Promise<void>;
	}

	let {
		loadData,
		pageSize = 25,
		filters = {},
		actionsHeader,
		rowActions,
		emptyState,
		errorState,
		onRefresh
	}: Props = $props();

	let rows = $state<Record<string, unknown>[]>([]);
	let total = $state(0);
	let errorMessage = $state('');

	async function runQuery(page = 1) {
		try {
			errorMessage = '';
			const result = await loadData({
				page,
				pageSize,
				search: '',
				sort: null,
				filters,
				signal: new AbortController().signal
			});
			rows = result.rows;
			total = result.total ?? result.rows.length;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : String(error);
			rows = [];
			total = 0;
		}
	}

	onMount(() => {
		void runQuery();
	});
</script>

<div data-testid="mock-table">
	{#if actionsHeader}
		<div data-testid="actions-header">{@render actionsHeader()}</div>
	{/if}

	<button data-testid="run-same-query" onclick={() => void runQuery()}>Run same query</button>
	<button data-testid="run-page-two" onclick={() => void runQuery(2)}>Run page two</button>
	<button
		data-testid="run-refresh"
		onclick={async () => {
			await onRefresh?.();
			await runQuery();
		}}
	>
		Refresh
	</button>

	{#if errorMessage && errorState}
		<div data-testid="error-state">{@render errorState(errorMessage)}</div>
	{:else if rows.length === 0 && emptyState}
		<div data-testid="empty-state">{@render emptyState()}</div>
	{/if}

	{#if rows[0] && rowActions}
		<div data-testid="row-actions">{@render rowActions(rows[0])}</div>
	{/if}

	<p data-testid="row-count">{rows.length}</p>
	<p data-testid="total-count">{total}</p>
	<p data-testid="first-row-dev-eui">{rows[0]?.dev_eui ?? ''}</p>
</div>
