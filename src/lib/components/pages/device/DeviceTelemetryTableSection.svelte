<script lang="ts">
	import CWTable from '$lib/components/CWTable.svelte';

	let {
		historyTableItems,
		historyTableColumns
	}: {
		historyTableItems: unknown[];
		historyTableColumns: unknown[];
	} = $props();
</script>

<section class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
	<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
		<div>
			<p class="text-xs uppercase tracking-[0.2em] text-slate-400">24h history</p>
			<h2 class="text-xl font-semibold text-white">All telemetry points</h2>
		</div>
	</div>

	<div class="overflow-hidden rounded-2xl border border-slate-800">
		<svelte:boundary>
			<CWTable
				items={historyTableItems}
				columns={historyTableColumns}
				pageSize={15}
				sortKey="timestamp"
				sortDir="desc"
				getRowId={(item) => (item as { timestamp: string }).timestamp}
			/>
			{#snippet failed(error, reset)}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-8 w-8 text-rose-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<p class="text-rose-300 font-medium">Failed to load telemetry data</p>
					<p class="mt-1 text-sm text-slate-400">
						{(error as Error)?.message || 'An unexpected error occurred'}
					</p>
					<button
						onclick={reset}
						class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
					>
						Try again
					</button>
				</div>
			{/snippet}
		</svelte:boundary>
	</div>
</section>
