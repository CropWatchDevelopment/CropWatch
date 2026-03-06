<!--
  AirDisplay.svelte — Display component for cw_air_data.

  The route page owns fetching, range selection, navigation, and export. This
  component only transforms the telemetry it receives and renders the UI for it.
-->
<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		CwHeatmap,
		CwLineChart,
		type CwColumnDef,
		type CwHeatmapDataPoint,
		type CwLineChartDataPoint,
		type CwLineChartSecondaryDataPoint,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import './AirDisplay.css';
	import NotesCreateDialog from './dialogs/notes-create-dialog.svelte';
	import type { AirRow } from './interfaces/AirRow.interface';
	import NotesViewDialog from './dialogs/notes-view-dialog.svelte';

	const HEATMAP_FALLBACK_DAYS = 1;
	const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

	const columns: CwColumnDef<AirRow>[] = [
		{ key: 'created_at', header: 'Timestamp', sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: 'Temp (°C)', sortable: true, width: '8rem' },
		{ key: 'humidity', header: 'Humidity (%)', sortable: true, width: '9rem' },
		{ key: 'co2', header: 'CO2 (ppm)', sortable: true, width: '9rem' }
	];

	let { latestData, historicalData, loading }: DeviceDisplayProps = $props();

	function toAirRows(raw: Record<string, unknown>[]): AirRow[] {
		return raw.map((row, index) => ({
			id: String(row.id ?? row.data_id ?? `${row.created_at ?? 'row'}-${index}`),
			created_at: String(row.created_at ?? ''),
			temperature_c: Number(row.temperature_c) || 0,
			humidity: Number(row.humidity) || 0,
			co2: Number(row.co2) || 0,
			dev_eui: String(row.dev_eui ?? ''),
			cw_air_annotations: Array.isArray(row.cw_air_annotations)
				? row.cw_air_annotations.map((annotation) => ({
						note: String(annotation.note ?? ''),
						created_at: String(annotation.created_at ?? '')
				  }))
				: []
		}));
	}

	function toTimestamp(value: string): number | null {
		const timestamp = new Date(value).getTime();
		return Number.isFinite(timestamp) ? timestamp : null;
	}

	let rows = $derived(toAirRows(historicalData));

	let latest = $derived({
		temperature_c: Number(latestData?.temperature_c) || 0,
		humidity: Number(latestData?.humidity) || 0,
		co2: Number(latestData?.co2) || 0
	});

	let lineSeries = $derived<(CwLineChartDataPoint & { timestamp: string })[]>(
		rows.map((row) => ({
			timestamp: row.created_at,
			created_at: row.created_at,
			value: row.temperature_c
		}))
	);

	let secondarySeries = $derived<(CwLineChartSecondaryDataPoint & { timestamp: string })[]>(
		rows.map((row) => ({
			timestamp: row.created_at,
			created_at: row.created_at,
			value: row.humidity
		}))
	);

	let heatmapSeries = $derived<(CwHeatmapDataPoint & { timestamp: string })[]>(
		rows.map((row) => ({
			timestamp: row.created_at,
			created_at: row.created_at,
			value: row.temperature_c
		}))
	);

	let heatmapDays = $derived.by(() => {
		const timestamps = rows
			.map((row) => toTimestamp(row.created_at))
			.filter((timestamp): timestamp is number => timestamp !== null);

		if (timestamps.length === 0) {
			return HEATMAP_FALLBACK_DAYS;
		}

		const firstTimestamp = Math.min(...timestamps);
		const lastTimestamp = Math.max(...timestamps);
		return Math.max(
			HEATMAP_FALLBACK_DAYS,
			Math.ceil((lastTimestamp - firstTimestamp) / MILLISECONDS_PER_DAY) + 1
		);
	});

	let tableLoading = $state(false);

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<AirRow>> {
		tableLoading = true;

		try {
			let filtered = [...rows].reverse();

			if (query.search.trim()) {
				const search = query.search.trim().toLowerCase();
				filtered = filtered.filter((row) =>
					[
						new Date(row.created_at).toLocaleString(),
						row.temperature_c.toFixed(2),
						row.humidity.toFixed(2),
						String(row.co2)
					]
						.join(' ')
						.toLowerCase()
						.includes(search)
				);
			}

			if (query.sort) {
				const direction = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					const left = a[query.sort!.column as keyof AirRow];
					const right = b[query.sort!.column as keyof AirRow];

					if (typeof left === 'number' && typeof right === 'number') {
						return (left - right) * direction;
					}

					return String(left).localeCompare(String(right)) * direction;
				});
			}

			const start = Math.max(0, (query.page - 1) * query.pageSize);
			return {
				rows: filtered.slice(start, start + query.pageSize),
				total: filtered.length
			};
		} finally {
			tableLoading = false;
		}
	}
</script>

{JSON.stringify(historicalData, null, 2)}

<div class="air-display">
	<div class="kpi-grid">
		<CwCard title="Current Temperature" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.temperature_c.toFixed(1)}<span>°C</span></p>
		</CwCard>

		<CwCard title="Current Humidity" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.humidity.toFixed(1)}<span>%</span></p>
		</CwCard>

		<CwCard title="Current CO2" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.co2.toFixed(0)}<span>ppm</span></p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<div class="chart-grid">
			<div class="chart-grid__item">
				<CwCard title="Temperature & Humidity" subtitle="Time series" elevated>
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
			</div>

			<div class="chart-grid__item">
				<CwCard title="Temperature Heatmap" subtitle="Reading density" elevated>
					<CwHeatmap
						data={heatmapSeries}
						days={heatmapDays}
						unit="°C"
						title=""
						rowHeight={18}
						colors={['#0ea5e9', '#84cc16', '#f97316']}
					/>
				</CwCard>
			</div>
		</div>

		<CwCard title="Telemetry Table" subtitle="Searchable, sortable data" elevated>
			<CwDataTable
				{columns}
				loadData={loadTableData}
				loading={tableLoading}
				rowKey="id"
				actionsHeader="Notes"
				searchable
			>
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
				{#snippet rowActions(row: AirRow)}
					<NotesCreateDialog {row} dev_eui={row.dev_eui} />
					{#if row.cw_air_annotations && row.cw_air_annotations.length > 0}
						<NotesViewDialog {row} />
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
