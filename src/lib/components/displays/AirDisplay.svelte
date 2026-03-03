<!--
  AirDisplay.svelte — Display component for cw_air_data.

  Renders KPI cards (temperature, humidity, CO₂), a line chart with
  temperature + humidity overlay, a heatmap, and a sortable data table.

  This component owns all air-specific column definitions, chart config,
  and formatting. The dispatcher page only passes DeviceDisplayProps.
-->
<script lang="ts">
	import {
		CwCard,
		CwChip,
		CwLineChart,
		CwHeatmap,
		CwDataTable,
		type CwColumnDef,
		type CwLineChartDataPoint,
		type CwLineChartSecondaryDataPoint,
		type CwHeatmapDataPoint,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';

	let { devEui, latestData, historicalData, loading }: DeviceDisplayProps = $props();

	// ---- Air-specific row shape ------------------------------------------------

	interface AirRow {
		id: string;
		created_at: string;
		temperature_c: number;
		humidity: number;
		co2: number;
	}

	function toAirRows(raw: Record<string, unknown>[]): AirRow[] {
		return raw.map((row, i) => ({
			id: String(row.id ?? row.data_id ?? `${row.created_at}-${i}`),
			created_at: String(row.created_at ?? ''),
			temperature_c: Number(row.temperature_c) || 0,
			humidity: Number(row.humidity) || 0,
			co2: Number(row.co2) || 0
		}));
	}

	// ---- Columns ---------------------------------------------------------------

	const columns: CwColumnDef<AirRow>[] = [
		{ key: 'created_at', header: 'Timestamp', sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: 'Temp (°C)', sortable: true, width: '8rem' },
		{ key: 'humidity', header: 'Humidity (%)', sortable: true, width: '9rem' },
		{ key: 'co2', header: 'CO₂ (ppm)', sortable: true, width: '9rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toAirRows(historicalData));

	let latest = $derived({
		temperature_c: Number(latestData?.temperature_c) || 0,
		humidity: Number(latestData?.humidity) || 0,
		co2: Number(latestData?.co2) || 0,
		created_at: String(latestData?.created_at ?? '')
	});

	let lineSeries = $derived<(CwLineChartDataPoint & { timestamp: string })[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			created_at: p.created_at,
			value: p.temperature_c
		}))
	);

	let secondarySeries = $derived<(CwLineChartSecondaryDataPoint & { timestamp: string })[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			created_at: p.created_at,
			value: p.humidity
		}))
	);

	let heatmapSeries = $derived<(CwHeatmapDataPoint & { timestamp: string })[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			created_at: p.created_at,
			value: p.temperature_c
		}))
	);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<AirRow>> {
		tableLoading = true;
		try {
			let filtered = [...rows].reverse();

			if (query.search.trim()) {
				const search = query.search.trim().toLowerCase();
				filtered = filtered.filter((r) =>
					[
						new Date(r.created_at).toLocaleString(),
						r.temperature_c.toFixed(2),
						r.humidity.toFixed(2),
						String(r.co2)
					]
						.join(' ')
						.toLowerCase()
						.includes(search)
				);
			}

			if (query.sort) {
				const dir = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					const av = a[query.sort!.column as keyof AirRow];
					const bv = b[query.sort!.column as keyof AirRow];
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

<div class="air-display">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwCard title="Temperature" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.temperature_c.toFixed(1)}<span>°C</span></p>
		</CwCard>

		<CwCard title="Humidity" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.humidity.toFixed(1)}<span>%</span></p>
		</CwCard>

		<CwCard title="CO₂" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.co2}<span>ppm</span></p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<div class="flex flex-row w-full gap-4">
			<!-- Charts -->
			<CwCard title="Temperature & Humidity" class="w-full" subtitle="Time series" elevated>
				<CwLineChart
					data={lineSeries}
					secondaryData={secondarySeries}
					primaryLabel="Temperature"
					secondaryLabel="Humidity"
					primaryUnit="°C"
					secondaryUnit="%"
					height={400}
				/>
			</CwCard>

			<CwCard title="Temperature Heatmap" class="w-full" subtitle="Hourly density" elevated>
				<CwHeatmap
					data={heatmapSeries}
					days={2}
					unit="°C"
					title=""
					rowHeight={18}
					colors={['#0ea5e9', '#84cc16', '#f97316']}
				/>
			</CwCard>
		</div>

		<!-- Data table -->
		<CwCard title="Telemetry Table" subtitle="Searchable, sortable data" elevated>
			<CwDataTable {columns} loadData={loadTableData} loading={tableLoading} rowKey="id" searchable>
				{#snippet cell(row: AirRow, col: CwColumnDef<AirRow>, defaultValue: string)}
					{#if col.key === 'created_at'}
						{new Date(row.created_at).toLocaleString()}
					{:else if col.key === 'temperature_c'}
						{row.temperature_c.toFixed(2)} °C
					{:else if col.key === 'humidity'}
						{row.humidity.toFixed(2)} %
					{:else if col.key === 'co2'}
						{row.co2} ppm
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title="No Data" elevated>
			<p>No air quality data available for the selected range.</p>
		</CwCard>
	{/if}
</div>

<style>
	.air-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
