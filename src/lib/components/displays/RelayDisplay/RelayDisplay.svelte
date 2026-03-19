<!--
  RelayDisplay.svelte — Display component for cw_relay_data.

  Renders relay toggle state cards and a history log of state changes.
  Unlike sensor displays, relays have boolean state columns (relay_1, relay_2)
  rather than continuous numeric time series.
-->
<script lang="ts">
	import {
		CwCard,
		CwChip,
		CwSwitch,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { formatDateTime } from '$lib/i18n/format';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';

	let { devEui, latestData, historicalData, loading }: DeviceDisplayProps = $props();

	// ---- Relay-specific row shape ----------------------------------------------

	interface RelayRow {
		id: string;
		created_at: string;
		relay_1: boolean;
		relay_2: boolean;
	}

	function toRelayRows(raw: Record<string, unknown>[]): RelayRow[] {
		return raw.map((row, i) => ({
			id: String(row.id ?? `${row.created_at}-${i}`),
			created_at: String(row.created_at ?? ''),
			relay_1: Boolean(row.relay_1),
			relay_2: Boolean(row.relay_2)
		}));
	}

	// ---- Columns ---------------------------------------------------------------

	const columns: CwColumnDef<RelayRow>[] = [
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'relay_1', header: m.display_relay_one(), sortable: true, width: '8rem' },
		{ key: 'relay_2', header: m.display_relay_two(), sortable: true, width: '8rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toRelayRows(historicalData));

	let latestRelay1 = $derived(Boolean(latestData?.relay_1));
	let latestRelay2 = $derived(Boolean(latestData?.relay_2));
	let lastUpdate = $derived(String(latestData?.created_at ?? latestData?.last_update ?? ''));

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<RelayRow>> {
		tableLoading = true;
		try {
			let filtered = [...rows].reverse();

			if (query.sort) {
				const dir = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					if (query.sort!.column === 'created_at') {
						return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
					}
					return 0;
				});
			}

			const start = Math.max(0, (query.page - 1) * query.pageSize);
			return { rows: filtered.slice(start, start + query.pageSize), total: filtered.length };
		} finally {
			tableLoading = false;
		}
	}
</script>

<div class="relay-display">
	<!-- Current relay status -->
	<div class="relay-grid">
		<CwCard title={m.display_relay_one()} subtitle={m.display_current_state()} elevated>
			<div class="relay-state">
				<CwSwitch checked={latestRelay1} disabled />
				<CwChip
					label={latestRelay1 ? m.display_on() : m.display_off()}
					tone={latestRelay1 ? 'success' : 'danger'}
					variant="soft"
				/>
			</div>
		</CwCard>

		<CwCard title={m.display_relay_two()} subtitle={m.display_current_state()} elevated>
			<div class="relay-state">
				<CwSwitch checked={latestRelay2} disabled />
				<CwChip
					label={latestRelay2 ? m.display_on() : m.display_off()}
					tone={latestRelay2 ? 'success' : 'danger'}
					variant="soft"
				/>
			</div>
		</CwCard>
	</div>

	{#if lastUpdate}
		<p class="last-update">{m.display_last_updated()}: {formatDateTime(lastUpdate)}</p>
	{/if}

	{#if !loading && rows.length > 0}
		<CwCard title={m.display_relay_history()} subtitle={m.display_state_change_log()} elevated>
			<CwDataTable {columns} loadData={loadTableData} loading={tableLoading} rowKey="id">
				{#snippet cell(row: RelayRow, col: CwColumnDef<RelayRow>, defaultValue: string)}
					{#if col.key === 'created_at'}
						{formatDateTime(row.created_at)}
					{:else if col.key === 'relay_1' || col.key === 'relay_2'}
						<CwChip
							label={row[col.key] ? m.display_on() : m.display_off()}
							tone={row[col.key] ? 'success' : 'danger'}
							variant="outline"
						/>
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title={m.display_no_data()} elevated>
			<p>{m.display_no_relay_history()}</p>
		</CwCard>
	{/if}
</div>

<style>
	.relay-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.relay-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 1rem;
	}
	.relay-state {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.5rem 0;
	}
	.last-update {
		font-size: 0.85rem;
		color: var(--cw-text-muted);
		text-align: right;
	}
</style>
