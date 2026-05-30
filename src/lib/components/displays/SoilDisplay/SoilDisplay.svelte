<!--
  SoilDisplay.svelte — Display component for cw_soil_data.

  Renders KPI cards for soil metrics (temperature, moisture, EC, pH),
  a sortable data table, and placeholder visualizations for the
  forthcoming combined sensor (air quality, light/PPFD, and VPD).
-->
<script lang="ts">
	import {
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwStatCardData,
		type CwStatCardLabels,
		type CwTableQuery,
		type CwTableResult,
		CwStatCard,
		CwResponsiveLineChart,
		type CwResponsiveLineSeries,
		CwPPFDChart,
		CwVPDChart,
		DliCard
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import { appTheme } from '$lib/theme/appTheme.svelte';
	import {
		cwDataTableLabels,
		cwResponsiveLineChartLabels,
		cwPpfdChartLabels,
		cwVpdChartLabels,
		cwDliCardLabels
	} from '$lib/i18n/cwuiLabels';

	let { devEui, latestData, historicalData, loading }: DeviceDisplayProps = $props();

	// Shared label set so every CwStatCard renders translated stat rows.
	const statLabels: CwStatCardLabels = {
		min: m.stat_min(),
		avg: m.stat_avg(),
		max: m.stat_max(),
		count: m.stat_count(),
		median: m.stat_median(),
		stdDev: m.stat_stdDev(),
		range: m.stat_range(),
		aboveAvg: m.stat_aboveAvg(),
		belowAvg: m.stat_belowAvg(),
		atAvg: m.stat_atAvg(),
		clickToExpand: m.stat_expand(),
		clickToCollapse: m.stat_collapse()
	};

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
		{ key: 'ec', header: 'EC (dS/cm)', sortable: true, width: '9rem' }
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

	// Re-key the table when the underlying row set changes so CwDataTable
	// re-runs loadData for the new date range instead of showing stale rows.
	let rowSetKey = $derived(
		`${rows.length}:${rows[0]?.id ?? ''}:${rows[rows.length - 1]?.id ?? ''}`
	);

	// ---- Forthcoming combined-sensor placeholders ------------------------------
	// The big soil sensor will also report air CO₂, air temperature, air
	// humidity, and light (PPFD). These are not wired up yet, so every
	// visualization renders in its no-data state for now.

	const airSeries: CwResponsiveLineSeries[] = [
		{ id: 'co2', label: m.rule_subject_co2(), unit: 'ppm', color: 'var(--cw-primary-500)', data: [] },
		{
			id: 'air_temperature',
			label: m.rule_subject_temperature(),
			unit: '°C',
			color: 'var(--cw-danger-500)',
			data: []
		},
		{
			id: 'air_humidity',
			label: m.rule_subject_humidity(),
			unit: '%',
			color: 'var(--cw-info-500)',
			data: []
		}
	];

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
		<CwStatCard
			title={m.rule_subject_temperature()}
			stats={temperatureStats}
			unit="°C"
			accentColor="var(--cw-danger-500)"
			labels={statLabels}
		/>

		<CwStatCard
			title={m.rule_subject_soil_moisture()}
			stats={soilMoistureStats}
			unit="%"
			accentColor="var(--cw-info-500)"
			labels={statLabels}
		/>

		<CwCard title="EC" subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{latest.ec.toFixed(2)}<span>dS/cm</span></p>
		</CwCard>

		{#if latest.ph > 0}
			<CwCard title={m.rule_subject_ph()} subtitle={m.display_latest_reading()} elevated>
				<p class="kpi-value">{latest.ph.toFixed(1)}</p>
			</CwCard>
		{/if}
	</div>

	<!-- Combined-sensor visualizations (awaiting data) -->
	<!-- Full-width time series; the dual charts pair up on desktop, stack on mobile. -->
	<CwResponsiveLineChart
		labels={cwResponsiveLineChartLabels()}
		series={airSeries}
		title={m.display_air_quality()}
		subtitle={m.display_air_quality_metrics()}
		ranges={[]}
		showLegendStats={false}
		theme={appTheme.current}
		height={360}
		noData={m.display_awaiting_sensor_data()}
	/>

	<div class="chart-pair">
		<CwVPDChart labels={cwVpdChartLabels()} noData={m.display_awaiting_sensor_data()} />
		<div class="chart-pair__stack">
			<CwPPFDChart labels={cwPpfdChartLabels()} noData={m.display_awaiting_sensor_data()} />
			<DliCard labels={cwDliCardLabels()} noData={m.display_awaiting_sensor_data()} />
		</div>
	</div>

	<!-- Soil telemetry table — always last. -->
	{#if !loading && rows.length > 0}
		<CwCard title={m.display_soil_telemetry()} subtitle={m.display_searchable_sortable()} elevated>
			{#key rowSetKey}
				<CwDataTable
					labels={cwDataTableLabels()}
					{columns}
					loadData={loadTableData}
					loading={tableLoading}
					rowKey="id"
					searchable
				>
					{#snippet cell(row: SoilRow, col: CwColumnDef<SoilRow>, defaultValue: string)}
						{#if col.key === 'created_at'}
							{new Date(row.created_at).toLocaleString()}
						{:else if col.key === 'temperature_c'}
							{row.temperature_c.toFixed(2)} °C
						{:else if col.key === 'moisture'}
							{row.moisture.toFixed(2)} %
						{:else if col.key === 'ec'}
							{row.ec.toFixed(2)} dS/cm
						{:else}
							{defaultValue}
						{/if}
					{/snippet}
				</CwDataTable>
			{/key}
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
	/* Mobile-first: single column. The VPD + PPFD charts pair up side by side
	   once there is room, so they aren't needlessly stretched full width on PC. */
	.chart-pair {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1rem;
		/* Stretch columns so the PPFD+DLI stack matches the VPD height on desktop. */
		align-items: stretch;
	}
	/* Grid items must be allowed to shrink below their content width so the
	   VPD matrix's internal horizontal scroll engages instead of overflowing. */
	.chart-pair > :global(*) {
		min-width: 0;
	}
	/* PPFD with the DLI card stacked directly beneath it — in the right
	   desktop column, and inline in the single-column mobile flow. */
	.chart-pair__stack {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}
	/* DLI (last child) grows to fill the column down to the VPD's bottom edge,
	   keeping the desktop layout flush/square. No-op in the single-column flow
	   where the stack has no extra height to distribute. */
	.chart-pair__stack > :global(:last-child) {
		flex: 1;
	}
	@media (min-width: 64rem) {
		.chart-pair {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
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
