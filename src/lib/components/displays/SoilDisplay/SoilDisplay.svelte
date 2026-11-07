<!--
  SoilDisplay.svelte — Display component for cw_soil_data.

  Renders KPI cards for the soil metrics (temperature, moisture, EC, pH), the
  air quality, VPD, PPFD and DLI panels for soil boards that also measure the
  air and light, and a sortable data table. A reading a probe did not report
  stays empty ("—"), never 0.
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
		CwDliCard
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import { getIntlLocale } from '$lib/i18n/format';
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
	import { labelFor } from '$lib/sensor-labels';
	import { convertSensorValue, formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
	import { computeStats } from '$lib/utils/computeStats';
	import { createClientTableLoader } from '$lib/utils/clientTableLoader';
	import {
		dliToday,
		fieldSeries,
		latestReading,
		SOIL_FIELDS,
		toSoilRows,
		type LatestReading,
		type SoilField,
		type SoilRow
	} from './soil-readings';
	import '../display-shared.css';

	let { latestData, historicalData, loading }: DeviceDisplayProps = $props();

	const app = getAppContext();

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toSoilRows(historicalData));
	// computeStats and the charts read oldest-first; the history is newest-first.
	let chronologicalRows = $derived([...rows].reverse());
	// Newest value of every field, from the latest row or the newest reading
	// that carries it (a reading can arrive without some of its frames).
	let latest = $derived(
		Object.fromEntries(
			SOIL_FIELDS.map((field) => [field, latestReading(rows, field, latestData)])
		) as Record<SoilField, LatestReading | null>
	);
	// Air and light fields get table columns only on devices that report them.
	let reportedExtras = $derived(
		(['co2', 'air_temperature_c', 'air_humidity', 'ppfd'] as const).filter((field) =>
			rows.some((row) => row[field] !== null)
		)
	);

	// Stats skip readings without the field, and use the display unit.
	function statsOf(field: 'temperature_c' | 'moisture') {
		return computeStats(
			chronologicalRows.flatMap((row) => {
				const value = row[field];
				return value === null ? [] : [convertSensorValue(field, value, app.preferences)];
			})
		);
	}
	let temperatureStats = $derived(statsOf('temperature_c'));
	let soilMoistureStats = $derived(statsOf('moisture'));
	let temperatureUnit = $derived(resolveDisplayUnit('temperature_c', app.preferences));

	// ---- Columns ---------------------------------------------------------------

	let columns = $derived<CwColumnDef<SoilRow>[]>([
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: m.display_soil_temperature(), sortable: true, width: '9rem' },
		{ key: 'moisture', header: m.rule_subject_soil_moisture(), sortable: true, width: '9rem' },
		{
			key: 'ec',
			header: `EC (${resolveDisplayUnit('ec', app.preferences)})`,
			sortable: true,
			width: '9rem'
		},
		...reportedExtras.map((field) => ({
			key: field,
			header: labelFor(field).label(),
			sortable: true,
			width: '9rem'
		}))
	]);

	// Re-key the table when the underlying row set changes so CwDataTable
	// re-runs loadData for the new date range instead of showing stale rows.
	let rowSetKey = $derived(
		`${rows.length}:${rows[0]?.id ?? ''}:${rows[rows.length - 1]?.id ?? ''}:${reportedExtras.join(',')}`
	);

	// ---- Air, VPD and light ----------------------------------------------------

	let airSeries = $derived<CwResponsiveLineSeries[]>([
		{
			id: 'co2',
			label: labelFor('co2').label(),
			unit: resolveDisplayUnit('co2', app.preferences),
			color: 'var(--cw-primary-500)',
			data: fieldSeries(chronologicalRows, 'co2', (value) =>
				convertSensorValue('co2', value, app.preferences)
			)
		},
		{
			id: 'air_temperature',
			label: labelFor('air_temperature_c').label(),
			unit: resolveDisplayUnit('air_temperature_c', app.preferences),
			color: 'var(--cw-danger-500)',
			data: fieldSeries(chronologicalRows, 'air_temperature_c', (value) =>
				convertSensorValue('air_temperature_c', value, app.preferences)
			)
		},
		{
			id: 'air_humidity',
			label: labelFor('air_humidity').label(),
			unit: resolveDisplayUnit('air_humidity', app.preferences),
			color: 'var(--cw-info-500)',
			data: fieldSeries(chronologicalRows, 'air_humidity')
		}
	]);
	let hasAirData = $derived(airSeries.some((series) => series.data.length > 0));
	let dli = $derived(dliToday(fieldSeries(chronologicalRows, 'ppfd')));

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	// Newest first, as the history comes.
	const loadTableData = createClientTableLoader<SoilRow>(() => rows, {
		searchText: (r) =>
			[r.created_at, ...SOIL_FIELDS.map((field) => r[field] ?? '')].map(String).join(' '),
		onLoadingChange: (value) => (tableLoading = value)
	});
</script>

<div class="soil-display">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwStatCard
			locale={getIntlLocale()}
			title={m.display_soil_temperature()}
			stats={temperatureStats}
			unit={temperatureUnit}
			accentColor="var(--cw-danger-500)"
			labels={cwStatCardLabels()}
		/>

		<CwStatCard
			locale={getIntlLocale()}
			title={m.rule_subject_soil_moisture()}
			stats={soilMoistureStats}
			unit="%"
			accentColor="var(--cw-info-500)"
			labels={cwStatCardLabels()}
		/>

		<CwCard title="EC" subtitle={m.display_latest_reading()} elevated>
			{@const ecKpi = formatSensorMeasurement('ec', latest.ec?.value ?? null, app.preferences, {
				maximumFractionDigits: 2
			})}
			<p class="kpi-value">{ecKpi.valueDisplay}<span>{ecKpi.unit}</span></p>
		</CwCard>

		<!-- Not every soil probe measures pH; hide the tile rather than show a blank. -->
		{#if latest.ph}
			<CwCard title={m.rule_subject_ph()} subtitle={m.display_latest_reading()} elevated>
				{@const phKpi = formatSensorMeasurement('ph', latest.ph.value, app.preferences, {
					maximumFractionDigits: 1
				})}
				<p class="kpi-value">{phKpi.valueDisplay}</p>
			</CwCard>
		{/if}
	</div>

	<!-- Air and light panels: each shows "awaiting sensor data" only while it has none. -->
	<!-- Full-width time series; the dual charts pair up on desktop, stack on mobile. -->
	<CwResponsiveLineChart
		locale={getIntlLocale()}
		labels={cwResponsiveLineChartLabels()}
		series={airSeries}
		title={m.display_air_quality()}
		subtitle={m.display_air_quality_metrics()}
		ranges={[]}
		showLegendStats={false}
		theme={appTheme.current}
		height={360}
		noData={hasAirData ? undefined : m.display_awaiting_sensor_data()}
	/>

	<div class="chart-pair">
		<CwVPDChart
			locale={getIntlLocale()}
			labels={cwVpdChartLabels()}
			airTemperatureC={latest.air_temperature_c?.value ?? null}
			relativeHumidity={latest.air_humidity?.value ?? null}
			useF={app.preferences?.temperature_unit === 'fahrenheit'}
			noData={latest.air_temperature_c && latest.air_humidity
				? false
				: m.display_awaiting_sensor_data()}
		/>
		<div class="chart-pair__stack">
			<CwPPFDChart
				locale={getIntlLocale()}
				labels={cwPpfdChartLabels()}
				current={latest.ppfd?.value ?? null}
				updatedAt={latest.ppfd?.at || undefined}
				dliToday={dli}
				noData={latest.ppfd ? undefined : m.display_awaiting_sensor_data()}
			/>
			<CwDliCard
				locale={getIntlLocale()}
				labels={cwDliCardLabels()}
				value={dli}
				noData={dli === null ? m.display_awaiting_sensor_data() : false}
			/>
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
					{#snippet cell(row: SoilRow, col: CwColumnDef<SoilRow>)}
						{#if col.key === 'created_at'}
							{new Date(row.created_at).toLocaleString()}
						{:else}
							{formatSensorMeasurement(col.key, row[col.key as SoilField], app.preferences).display}
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
