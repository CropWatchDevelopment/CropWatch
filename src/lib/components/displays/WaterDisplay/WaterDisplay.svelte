<!--
  WaterDisplay.svelte — Display component for cw_water_data.

  Renders KPI cards for water metrics (temperature, depth, pressure, SpO₂)
  and a sortable data table.
-->
<script lang="ts">
	import { CwCard, CwDataTable, type CwColumnDef } from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import { getAppContext } from '$lib/appContext.svelte';
	import { formatSensorMeasurement } from '$lib/units';
	import { createClientTableLoader } from '$lib/utils/clientTableLoader';
	import '../display-shared.css';

	let { latestData, historicalData, loading }: DeviceDisplayProps = $props();

	const app = getAppContext();

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
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: m.rule_subject_temperature(), sortable: true, width: '8rem' },
		{ key: 'depth_cm', header: m.rule_subject_water_depth(), sortable: true, width: '9rem' },
		{ key: 'pressure', header: m.rule_subject_pressure(), sortable: true, width: '9rem' },
		{ key: 'spo2', header: m.rule_subject_spo2(), sortable: true, width: '7rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toWaterRows(historicalData));

	let latest = $derived({
		temperature_c: Number(latestData?.temperature_c) || 0,
		depth_cm: Number(latestData?.depth_cm ?? latestData?.deapth_cm) || 0,
		pressure: Number(latestData?.pressure) || 0,
		spo2: Number(latestData?.spo2) || 0
	});

	const tempKpi = $derived(
		formatSensorMeasurement('temperature_c', latest.temperature_c, app.preferences, {
			maximumFractionDigits: 1
		})
	);
	const depthKpi = $derived(
		formatSensorMeasurement('deapth_cm', latest.depth_cm, app.preferences, {
			maximumFractionDigits: 1
		})
	);
	const pressureKpi = $derived(
		formatSensorMeasurement('pressure', latest.pressure, app.preferences, {
			maximumFractionDigits: 1
		})
	);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	const loadTableData = createClientTableLoader<WaterRow>(() => rows, {
		reverse: true,
		searchText: (r) =>
			[r.created_at, r.temperature_c, r.depth_cm, r.pressure, r.spo2].map(String).join(' '),
		onLoadingChange: (value) => (tableLoading = value)
	});
</script>

<div class="water-display">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwCard title={m.display_water_temperature()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{tempKpi.valueDisplay}<span>{tempKpi.unit}</span></p>
		</CwCard>

		<CwCard title={m.display_depth()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{depthKpi.valueDisplay}<span>{depthKpi.unit}</span></p>
		</CwCard>

		<CwCard title={m.rule_subject_pressure()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{pressureKpi.valueDisplay}<span>{pressureKpi.unit}</span></p>
		</CwCard>

		<CwCard title={m.rule_subject_spo2()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{latest.spo2.toFixed(1)}</p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<CwCard title={m.display_water_telemetry()} subtitle={m.display_searchable_sortable()} elevated>
			<CwDataTable
				labels={cwDataTableLabels()}
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
						{formatSensorMeasurement('temperature_c', row.temperature_c, app.preferences).display}
					{:else if col.key === 'depth_cm'}
						{formatSensorMeasurement('deapth_cm', row.depth_cm, app.preferences, {
							maximumFractionDigits: 1
						}).display}
					{:else if col.key === 'pressure'}
						{formatSensorMeasurement('pressure', row.pressure, app.preferences, {
							maximumFractionDigits: 1
						}).display}
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title={m.display_no_data()} elevated>
			<p>{m.display_no_water_data_selected_range()}</p>
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
	/* .kpi-value styles come from ../display-shared.css */
</style>
