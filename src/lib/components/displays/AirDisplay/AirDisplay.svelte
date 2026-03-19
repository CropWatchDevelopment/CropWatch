<script lang="ts">
	import {
		CwCard,
		CwDataTable,
		CwDuration,
		CwHeatmap,
		CwLineChart,
		type CwColumnDef,
		type CwHeatmapDataPoint,
		type CwLineChartDataPoint,
		type CwLineChartSecondaryDataPoint,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { ApiService } from '$lib/api/api.service';
	import { formatDateTime } from '$lib/i18n/format';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import './AirDisplay.css';
	import NotesCreateDialog from './dialogs/notes-create-dialog.svelte';
	import type { AirRow } from './interfaces/AirRow.interface';
	import NotesViewDialog from './dialogs/notes-view-dialog.svelte';

	const HEATMAP_FALLBACK_DAYS = 1;
	const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

	const columns: CwColumnDef<AirRow>[] = [
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: m.rule_subject_temperature(), sortable: true, width: '8rem' },
		{ key: 'humidity', header: m.rule_subject_humidity(), sortable: true, width: '9rem' },
		{ key: 'co2', header: m.rule_subject_co2(), sortable: true, width: '9rem' },
		{ key: 'alerts', header: m.status_alerts(), width: '3rem' }
	];

	const ALARM_AFTER_MINUTES = 10.5;

	let { latestData, historicalData, loading, devEui, authToken }: DeviceDisplayProps = $props();

	function toAirRows(raw: Record<string, unknown>[]): AirRow[] {
		return raw.map((row, index) => ({
			id: String(row.id ?? row.data_id ?? `${row.created_at ?? 'row'}-${index}`),
			created_at: String(row.created_at ?? ''),
			temperature_c: Number(row.temperature_c) || 0,
			humidity: Number(row.humidity) || 0,
			co2: Number(row.co2) || 0,
			dev_eui: String(row.dev_eui ?? ''),
			alerts: Array.isArray(row.alerts) ? (row.alerts as AirRow['alerts']) : [],
			cw_air_annotations: Array.isArray(row.cw_air_annotations)
				? row.cw_air_annotations.map((annotation) => ({
						id: String(
							annotation.id ?? `${annotation.created_at ?? 'note'}-${annotation.note ?? index}`
						),
						note: String(annotation.note ?? ''),
						created_at: String(annotation.created_at ?? '')
					}))
				: []
		}));
	}

	let historicalDataKey = $derived.by(() => {
		const firstId = String(historicalData[0]?.id ?? historicalData[0]?.created_at ?? '');
		const lastId = String(
			historicalData[historicalData.length - 1]?.id ??
				historicalData[historicalData.length - 1]?.created_at ??
				''
		);
		return `${historicalData.length}:${firstId}:${lastId}`;
	});
	let extraRowsByKey = $state<Record<string, Record<string, unknown>[]>>({});
	let extraRows = $derived(extraRowsByKey[historicalDataKey] ?? []);
	let allRawData = $derived([...historicalData, ...extraRows]);
	let rows = $derived(
		toAirRows(allRawData).sort(
			(a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
		)
	);

	let latest = $derived.by(() => {
		// Use the most recent row if we have fetched newer data, otherwise fall back to latestData prop
		const newestRow =
			rows.length > 0
				? rows.reduce((best, row) =>
						new Date(row.created_at).getTime() > new Date(best.created_at).getTime() ? row : best
					)
				: null;

		const propTime = latestData?.created_at ? new Date(String(latestData.created_at)).getTime() : 0;
		const rowTime = newestRow ? new Date(newestRow.created_at).getTime() : 0;

		if (newestRow && rowTime >= propTime) {
			return {
				temperature_c: newestRow.temperature_c,
				humidity: newestRow.humidity,
				co2: newestRow.co2
			};
		}

		return {
			temperature_c: Number(latestData?.temperature_c) || 0,
			humidity: Number(latestData?.humidity) || 0,
			co2: Number(latestData?.co2) || 0
		};
	});

	let lastSeenTimestamp = $derived.by(() => {
		if (rows.length === 0) return null;
		return rows.reduce((latest, row) => {
			const t = new Date(row.created_at).getTime();
			return t > new Date(latest).getTime() ? row.created_at : latest;
		}, rows[0].created_at);
	});

	let refreshing = $state(false);

	async function fetchLatestData() {
		if (!authToken || !devEui || refreshing) return;

		refreshing = true;
		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const result = await api.getDeviceLatestData(devEui);

			if (result && typeof result === 'object' && result.created_at) {
				const existingIds = new Set(rows.map((r) => r.id));
				const newId = String(result.id ?? result.data_id ?? `${result.created_at}-latest`);
				if (!existingIds.has(newId)) {
					extraRowsByKey = {
						...extraRowsByKey,
						[historicalDataKey]: [...extraRows, result]
					};
				}
			}
		} catch (err) {
			console.error('Failed to fetch latest air data:', err);
		} finally {
			refreshing = false;
		}
	}

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
			.map((row) => new Date(row.created_at).getTime())
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

<div class="air-display">
	{#if lastSeenTimestamp}
		<div class="air-display__last-updated">
			<span>{m.display_last_updated()}:</span>
			<CwDuration
				from={lastSeenTimestamp}
				alarmAfterMinutes={ALARM_AFTER_MINUTES}
				alarmCallback={fetchLatestData}
			/>
		</div>
	{/if}

	<div class="kpi-grid">
		<CwCard title={m.display_current_temperature()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{latest.temperature_c.toFixed(1)}<span>°C</span></p>
		</CwCard>

		<CwCard title={m.display_current_humidity()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{latest.humidity.toFixed(1)}<span>%</span></p>
		</CwCard>

		<CwCard title={m.display_current_co2()} subtitle={m.display_latest_reading()} elevated>
			<p class="kpi-value">{latest.co2.toFixed(0)}<span>ppm</span></p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<div class="chart-grid">
			<div class="chart-grid__item">
				<CwCard
					title={m.display_temperature_humidity_chart()}
					subtitle={m.display_time_series()}
					elevated
				>
					<CwLineChart
						data={lineSeries}
						secondaryData={secondarySeries}
						primaryLabel={m.rule_subject_temperature()}
						secondaryLabel={m.rule_subject_humidity()}
						primaryUnit="°C"
						secondaryUnit="%"
						height={400}
					/>
				</CwCard>
			</div>

			<div class="chart-grid__item">
				<CwCard
					title={m.display_temperature_heatmap()}
					subtitle={m.display_reading_density()}
					elevated
				>
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

		<CwCard
			title={m.display_telemetry_table()}
			subtitle={m.display_searchable_sortable_data()}
			elevated
		>
			<CwDataTable
				{columns}
				loadData={loadTableData}
				loading={tableLoading}
				rowKey="id"
				rowActionsHeader={m.common_actions()}
				searchable
			>
				{#snippet cell(row: AirRow, col: CwColumnDef<AirRow>, defaultValue: string)}
					<div class="text-2xl">
						{#if col.key === 'created_at'}
							{formatDateTime(row.created_at)}
						{:else if col.key === 'temperature_c'}
							{row.temperature_c.toFixed(2)} °C
						{:else if col.key === 'humidity'}
							{row.humidity.toFixed(2)} %
						{:else if col.key === 'co2'}
							{row.co2} ppm
						{:else if col.key === 'alerts'}
							{#if row.alerts && row.alerts.length > 0}
								❌
							{:else}
								✅
							{/if}
						{:else}
							{defaultValue}
						{/if}
					</div>
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
		<CwCard title={m.display_no_data()} elevated>
			<p>{m.display_no_air_quality_data_selected_range()}</p>
		</CwCard>
	{/if}
</div>
