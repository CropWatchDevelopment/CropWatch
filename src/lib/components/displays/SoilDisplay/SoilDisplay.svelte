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
		cwStatCardLabels,
		cwVpdChartLabels,
		cwDliCardLabels
	} from '$lib/i18n/cwuiLabels';
	import { getAppContext } from '$lib/appContext.svelte';
	import { convertSensorValue, formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
	import { computeStats } from '$lib/utils/computeStats';
	import { createClientTableLoader } from '$lib/utils/clientTableLoader';
	import '../display-shared.css';

	let { latestData, historicalData, loading }: DeviceDisplayProps = $props();

	const app = getAppContext();

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

	let columns = $derived<CwColumnDef<SoilRow>[]>([
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: m.rule_subject_temperature(), sortable: true, width: '8rem' },
		{ key: 'moisture', header: m.rule_subject_soil_moisture(), sortable: true, width: '9rem' },
		{
			key: 'ec',
			header: `EC (${resolveDisplayUnit('ec', app.preferences)})`,
			sortable: true,
			width: '9rem'
		}
	]);

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toSoilRows(historicalData));

	let latest = $derived({
		temperature_c: Number(latestData?.temperature_c) || 0,
		moisture: Number(latestData?.moisture) || 0,
		ec: Number(latestData?.ec) || 0,
		ph: Number(latestData?.ph) || 0
	});

	// Stats are computed on converted values so min/avg/max/stdDev are all in the
	// display unit; the unit label comes from the same resolver.
	let temperatureStats = $derived(
		computeStats(
			rows.map((r) => convertSensorValue('temperature_c', r.temperature_c, app.preferences))
		)
	);
	let soilMoistureStats = $derived(computeStats(rows.map((r) => r.moisture)));
	let temperatureUnit = $derived(resolveDisplayUnit('temperature_c', app.preferences));

	// Re-key the table when the underlying row set changes so CwDataTable
	// re-runs loadData for the new date range instead of showing stale rows.
	let rowSetKey = $derived(
		`${rows.length}:${rows[0]?.id ?? ''}:${rows[rows.length - 1]?.id ?? ''}`
	);

	// ---- Forthcoming combined-sensor placeholders ------------------------------
	// The big soil sensor will also report air CO₂, air temperature, air
	// humidity, and light (PPFD). These are not wired up yet, so every
	// visualization renders in its no-data state for now.

	// Units follow the same resolvers the (future) converted values will use.
	let airSeries = $derived<CwResponsiveLineSeries[]>([
		{
			id: 'co2',
			label: m.rule_subject_co2(),
			unit: resolveDisplayUnit('co2', app.preferences),
			color: 'var(--cw-primary-500)',
			data: []
		},
		{
			id: 'air_temperature',
			label: m.rule_subject_temperature(),
			unit: resolveDisplayUnit('temperature_c', app.preferences),
			color: 'var(--cw-danger-500)',
			data: []
		},
		{
			id: 'air_humidity',
			label: m.rule_subject_humidity(),
			unit: resolveDisplayUnit('humidity', app.preferences),
			color: 'var(--cw-info-500)',
			data: []
		}
	]);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	const loadTableData = createClientTableLoader<SoilRow>(() => rows, {
		reverse: true,
		searchText: (r) =>
			[r.created_at, r.temperature_c, r.moisture, r.ec, r.ph].map(String).join(' '),
		onLoadingChange: (value) => (tableLoading = value)
	});
</script>

<div class="soil-display">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwStatCard
			title={m.rule_subject_temperature()}
			stats={temperatureStats}
			unit={temperatureUnit}
			accentColor="var(--cw-danger-500)"
			labels={cwStatCardLabels()}
		/>

		<CwStatCard
			title={m.rule_subject_soil_moisture()}
			stats={soilMoistureStats}
			unit="%"
			accentColor="var(--cw-info-500)"
			labels={cwStatCardLabels()}
		/>

		<CwCard title="EC" subtitle={m.display_latest_reading()} elevated>
			{@const ecKpi = formatSensorMeasurement('ec', latest.ec, app.preferences, {
				maximumFractionDigits: 2
			})}
			<p class="kpi-value">{ecKpi.valueDisplay}<span>{ecKpi.unit}</span></p>
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
							{formatSensorMeasurement('temperature_c', row.temperature_c, app.preferences).display}
						{:else if col.key === 'moisture'}
							{formatSensorMeasurement('moisture', row.moisture, app.preferences).display}
						{:else if col.key === 'ec'}
							{formatSensorMeasurement('ec', row.ec, app.preferences, {
								maximumFractionDigits: 2
							}).display}
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
	/* .kpi-value styles come from ../display-shared.css */
</style>
