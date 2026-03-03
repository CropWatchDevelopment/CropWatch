<!--
  PowerDisplay.svelte — Display component for cw_power_data.

  Skeleton display for power monitoring devices. Since the cw_power_data
  schema isn't fully defined yet, this uses the generic auto-discovery
  pattern from DefaultDisplay but provides a dedicated file so that
  power-specific KPIs, charts, and formatting can be added later without
  touching the registry or dispatcher.
-->
<script lang="ts">
	import { CwCard, CwChip } from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';

	let { devEui, latestData, historicalData, loading }: DeviceDisplayProps = $props();

	/** Auto-discover column keys from the first data row, excluding metadata. */
	const EXCLUDED_KEYS = new Set(['id', 'dev_eui', 'is_simulated']);

	let columns = $derived(
		historicalData.length > 0
			? Object.keys(historicalData[0]).filter((k) => !EXCLUDED_KEYS.has(k))
			: []
	);

	let numericColumns = $derived(
		columns.filter((k) => {
			const sample = historicalData.find((r) => r[k] != null);
			return sample != null && typeof sample[k] === 'number';
		})
	);
</script>

<div class="power-display">
	<!-- Latest readings (auto-discovered numeric fields) -->
	{#if latestData}
		<div class="kpi-grid">
			{#each numericColumns as col (col)}
				<CwCard title={col} subtitle="Latest" elevated>
					<p class="kpi-value">{Number(latestData[col] ?? 0).toFixed(2)}</p>
				</CwCard>
			{/each}
		</div>
	{/if}

	{#if loading}
		<CwCard title="Loading…" elevated>
			<p>Fetching power data…</p>
		</CwCard>
	{:else if historicalData.length === 0}
		<CwCard title="No Data" elevated>
			<p>No power data available for the selected range.</p>
		</CwCard>
	{:else}
		<CwCard title="Power Data" subtitle={devEui} elevated>
			<CwChip label="Power" tone="warning" variant="soft" />
			<div class="table-wrapper">
				<table>
					<thead>
						<tr>
							{#each columns as col (col)}
								<th>{col}</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each historicalData.slice(0, 100) as row, i (i)}
							<tr>
								{#each columns as col (col)}
									<td>{row[col] ?? '—'}</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</CwCard>
	{/if}
</div>

<style>
	.power-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: 1rem;
	}
	.kpi-value {
		margin: 0 0 0.75rem;
		font-size: clamp(1.45rem, 2.1vw, 2rem);
		font-weight: 700;
		color: var(--cw-text-primary);
	}
	.table-wrapper {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}
	th,
	td {
		padding: 0.5rem 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--cw-border, #e5e7eb);
	}
	th {
		font-weight: 600;
		white-space: nowrap;
	}
</style>
