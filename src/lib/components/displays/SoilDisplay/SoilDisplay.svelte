<!--
  SoilDisplay.svelte — Display component for cw_soil_data.

  Renders KPI cards for soil metrics (temperature, moisture, EC, pH),
  a line chart, and a sortable data table.
-->
<script lang="ts">
	import {
		CwCard,
		CwLineChart,
		CwDataTable,
		type CwColumnDef,
		type CwLineChartDataPoint,
		type CwStatCardData,
		type CwTableQuery,
		type CwTableResult,
		CwStatCard
	} from '@cropwatchdevelopment/cwui';
	import { formatDateTime } from '$lib/i18n/format';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';

	let { devEui, latestData, historicalData, loading }: DeviceDisplayProps = $props();

	function computeStats(values: number[]): CwStatCardData {
		if (values.length === 0) return {};
		const sorted = [...values].sort((a, b) => a - b);
		const count = sorted.length;
		const min = sorted[0];
		const max = sorted[count - 1];
		const avg = sorted.reduce((s, v) => s + v, 0) / count;
		const median =
			count % 2 === 1
				? sorted[Math.floor(count / 2)]
				: (sorted[count / 2 - 1] + sorted[count / 2]) / 2;
		const stdDev = Math.sqrt(sorted.reduce((s, v) => s + (v - avg) ** 2, 0) / count);
		const lastReading = values[values.length - 1];
		const trend: CwStatCardData['trend'] =
			values.length >= 2
				? values[values.length - 1] > values[values.length - 2]
					? 'up'
					: values[values.length - 1] < values[values.length - 2]
						? 'down'
						: 'stable'
				: 'stable';
		return { min, max, avg, median, stdDev, count, lastReading, trend };
	}

	// ---- Soil-specific row shape -----------------------------------------------

	interface SoilRow {
		id: string;
		created_at: string;
		temperature_c: number;
		moisture: number;
		ec: number;
		ph: number;
	}

	function toSoilRows(raw: Record<string, unknown>[]): SoilRow[] {
		return raw.map((row, i) => ({
			id: String(row.id ?? `${row.created_at}-${i}`),
			created_at: String(row.created_at ?? ''),
			temperature_c: Number(row.temperature_c) || 0,
			moisture: Number(row.moisture) || 0,
			ec: Number(row.ec) || 0,
			ph: Number(row.ph) || 0
		}));
	}

	// ---- Columns ---------------------------------------------------------------

	const columns: CwColumnDef<SoilRow>[] = [
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: m.rule_subject_temperature(), sortable: true, width: '8rem' },
		{ key: 'moisture', header: m.rule_subject_soil_moisture(), sortable: true, width: '9rem' },
		{ key: 'ec', header: 'EC (µS/cm)', sortable: true, width: '9rem' },
		{ key: 'ph', header: m.rule_subject_ph(), sortable: true, width: '6rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toSoilRows(historicalData));

	let latest = $derived({
		temperature_c: Number(latestData?.temperature_c) || 0,
		moisture: Number(latestData?.moisture) || 0,
		ec: Number(latestData?.ec) || 0,
		ph: Number(latestData?.ph) || 0
	});

	let temperatureStats = $derived(computeStats(rows.map((r) => r.temperature_c)));
	let soilMoistureStats = $derived(computeStats(rows.map((r) => r.moisture)));

	let moistureSeries = $derived<CwLineChartDataPoint[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			value: p.moisture
		}))
	);

	let temperatureSeries = $derived(
		rows.map((p) => ({
			timestamp: p.created_at,
			value: p.temperature_c
		}))
	);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<SoilRow>> {
		tableLoading = true;
		try {
			let filtered = [...rows].reverse();

			if (query.search.trim()) {
				const search = query.search.trim().toLowerCase();
				filtered = filtered.filter((r) =>
					[r.created_at, r.temperature_c, r.moisture, r.ec, r.ph]
						.map(String)
						.join(' ')
						.toLowerCase()
						.includes(search)
				);
			}

			if (query.sort) {
				const dir = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					const av = a[query.sort!.column as keyof SoilRow];
					const bv = b[query.sort!.column as keyof SoilRow];
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

<div class="soil-display">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwStatCard title={m.rule_subject_temperature()} stats={temperatureStats} unit="°C" labels={{ clickToExpand: m.stat_expand(), clickToCollapse: m.stat_collapse() }} />

		<CwStatCard title={m.rule_subject_soil_moisture()} stats={soilMoistureStats} unit="%" labels={{ clickToExpand: m.stat_expand(), clickToCollapse: m.stat_collapse() }} />

		<CwCard title="EC" subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{latest.ec.toFixed(0)}<span>µS/cm</span></p>
		</CwCard>

		<CwCard title={m.rule_subject_ph()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{latest.ph.toFixed(1)}</p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<CwCard
			title={m.display_soil_moisture_temperature()}
			subtitle={m.display_time_series()}
			elevated
		>
			<CwLineChart
				data={moistureSeries}
				secondaryData={temperatureSeries}
				primaryLabel={m.rule_subject_soil_moisture()}
				primaryUnit="%"
				secondaryLabel={m.rule_subject_temperature()}
				secondaryUnit="°C"
				height={400}
			/>
		</CwCard>

		<CwCard title={m.display_soil_telemetry()} subtitle={m.display_searchable_sortable()} elevated>
			<CwDataTable {columns} loadData={loadTableData} loading={tableLoading} rowKey="id" searchable>
				{#snippet cell(row: SoilRow, col: CwColumnDef<SoilRow>, defaultValue: string)}
					{#if col.key === 'created_at'}
						{new Date(row.created_at).toLocaleString()}
					{:else if col.key === 'temperature_c'}
						{row.temperature_c.toFixed(2)} °C
					{:else if col.key === 'moisture'}
						{row.moisture.toFixed(2)} %
					{:else if col.key === 'ec'}
						{row.ec.toFixed(0)} µS/cm
					{:else if col.key === 'ph'}
						{row.ph.toFixed(2)}
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title={m.display_no_data()} elevated>
			<p>{m.display_no_soil_data_selected_range()}</p>
		</CwCard>
	{/if}
</div>

<style>
	.soil-display {
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
