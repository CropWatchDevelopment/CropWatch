<!--
  WaterDisplay.svelte — Display component for cw_water_data.

  Renders KPI cards for water metrics (temperature, depth, pressure, SpO₂),
  a line chart, and a sortable data table.
-->
<script lang="ts">
	import {
		CwCard,
		CwChip,
		CwLineChart,
		CwDataTable,
		type CwColumnDef,
		type CwLineChartDataPoint,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';

	let { devEui, latestData, historicalData, loading }: DeviceDisplayProps = $props();

	// ---- Water-specific row shape ----------------------------------------------

	interface WaterRow {
		id: string;
		created_at: string;
		temperature_c: number;
		depth_cm: number;
		pressure: number;
		spo2: number;
	}

	function toWaterRows(raw: Record<string, unknown>[]): WaterRow[] {
		return raw.map((row, i) => ({
			id: String(row.id ?? `${row.created_at}-${i}`),
			created_at: String(row.created_at ?? ''),
			temperature_c: Number(row.temperature_c) || 0,
			// Note: DB column is misspelled as `deapth_cm` — handle both
			depth_cm: Number(row.depth_cm ?? row.deapth_cm) || 0,
			pressure: Number(row.pressure) || 0,
			spo2: Number(row.spo2) || 0
		}));
	}

	// ---- Columns ---------------------------------------------------------------

	const columns: CwColumnDef<WaterRow>[] = [
		{ key: 'created_at', header: 'Timestamp', sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: 'Temp (°C)', sortable: true, width: '8rem' },
		{ key: 'depth_cm', header: 'Depth (cm)', sortable: true, width: '9rem' },
		{ key: 'pressure', header: 'Pressure', sortable: true, width: '9rem' },
		{ key: 'spo2', header: 'SpO₂', sortable: true, width: '7rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toWaterRows(historicalData));

	let latest = $derived({
		temperature_c: Number(latestData?.temperature_c) || 0,
		depth_cm: Number(latestData?.depth_cm ?? latestData?.deapth_cm) || 0,
		pressure: Number(latestData?.pressure) || 0,
		spo2: Number(latestData?.spo2) || 0
	});

	let depthSeries = $derived<(CwLineChartDataPoint & { timestamp: string })[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			created_at: p.created_at,
			value: p.depth_cm
		}))
	);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<WaterRow>> {
		tableLoading = true;
		try {
			let filtered = [...rows].reverse();

			if (query.search.trim()) {
				const search = query.search.trim().toLowerCase();
				filtered = filtered.filter((r) =>
					[r.created_at, r.temperature_c, r.depth_cm, r.pressure, r.spo2]
						.map(String)
						.join(' ')
						.toLowerCase()
						.includes(search)
				);
			}

			if (query.sort) {
				const dir = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					const av = a[query.sort!.column as keyof WaterRow];
					const bv = b[query.sort!.column as keyof WaterRow];
					if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
					return String(av).localeCompare(String(bv)) * dir;
				});
			}

			const start = Math.max(0, (query.page - 1) * query.pageSize);
			return { rows: filtered.slice(start, start + query.pageSize), total: filtered.length };
		} finally {
			tableLoading = false;
		}
	}
</script>

<div class="water-display">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwCard title="Water Temperature" subtitle="Latest" elevated>
			<p class="kpi-value">{latest.temperature_c.toFixed(1)}<span>°C</span></p>
		</CwCard>

		<CwCard title="Depth" subtitle="Latest" elevated>
			<p class="kpi-value">{latest.depth_cm.toFixed(1)}<span>cm</span></p>
		</CwCard>

		<CwCard title="Pressure" subtitle="Latest" elevated>
			<p class="kpi-value">{latest.pressure.toFixed(1)}</p>
		</CwCard>

		<CwCard title="SpO₂" subtitle="Latest" elevated>
			<p class="kpi-value">{latest.spo2.toFixed(1)}</p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<CwCard title="Water Depth" subtitle="Time series" elevated>
			<CwLineChart
				data={depthSeries}
				primaryLabel="Depth"
				primaryUnit="cm"
				height={400}
			/>
		</CwCard>

		<CwCard title="Water Telemetry" subtitle="Searchable, sortable" elevated>
			<CwDataTable
				{columns}
				loadData={loadTableData}
				loading={tableLoading}
				rowKey="id"
				searchable
			>
				{#snippet cell(row: WaterRow, col: CwColumnDef<WaterRow>, defaultValue: string)}
					{#if col.key === 'created_at'}
						{new Date(row.created_at).toLocaleString()}
					{:else if col.key === 'temperature_c'}
						{row.temperature_c.toFixed(2)} °C
					{:else if col.key === 'depth_cm'}
						{row.depth_cm.toFixed(1)} cm
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title="No Data" elevated>
			<p>No water data available for the selected range.</p>
		</CwCard>
	{/if}
</div>

<style>
	.water-display {
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
	.kpi-value span {
		margin-left: 0.35rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--cw-text-muted);
	}
</style>
