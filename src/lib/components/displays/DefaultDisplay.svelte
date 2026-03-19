<!--
  DefaultDisplay.svelte — Fallback display component.

  Used when a device's data_table doesn't match any entry in TABLE_REGISTRY.
  Renders a generic key/value table by auto-discovering all columns from the
  first historical row. Keeps everything working even for unknown table types.
-->
<script lang="ts">
	import { CwCard, CwChip } from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';

	let { devEui, historicalData, loading }: DeviceDisplayProps = $props();

	/** Auto-discover column keys from the first data row, excluding metadata fields. */
	const EXCLUDED_KEYS = new Set(['id', 'dev_eui', 'is_simulated']);

	let columns = $derived(
		historicalData.length > 0
			? Object.keys(historicalData[0]).filter((k) => !EXCLUDED_KEYS.has(k))
			: []
	);
</script>

<div class="default-display">
	<CwCard title={m.display_device_data()} subtitle={devEui} elevated>
		<CwChip label={m.display_generic_view()} tone="info" variant="soft" />

		{#if loading}
			<p>{m.display_loading_data()}</p>
		{:else if historicalData.length === 0}
			<p>{m.display_no_data_selected_range()}</p>
		{:else}
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
		{/if}
	</CwCard>
</div>

<style>
	.default-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
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
