<script lang="ts">
	import {
		CwCard,
		CwDataTable,
		CwDuration,
		CwHeatmap,
		CwLineChart,
		CwStatCard,
		type CwColumnDef,
		type CwHeatmapDataPoint,
		type CwLineChartDataPoint,
		type CwLineChartSecondaryDataPoint,
		type CwStatCardData,
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
	import type { Note } from './interfaces/note.interface';
	import NotesViewDialog from './dialogs/notes-view-dialog.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import CHECK_CIRCLE_ICON from '$lib/images/icons/check_circle.svg';

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
	let noteOverridesByDevice = $state<Record<string, Record<string, Note[]>>>({});
	let tableRevision = $state(0);
	let noteOverrides = $derived(noteOverridesByDevice[devEui] ?? {});
	let hasCo2: boolean = $state(
		historicalData.every((row) => row.co2 !== undefined && row.co2 !== null && row.co2 !== 0)
	);

	function toAirRows(raw: Record<string, unknown>[]): AirRow[] {
		return raw.map((row, index) => ({
			id: String(row.id ?? row.data_id ?? `${row.created_at ?? 'row'}-${index}`),
			created_at: String(row.created_at ?? ''),
			temperature_c: Number(row.temperature_c) || 0,
			humidity: Number(row.humidity) || 0,
			co2: Number(row.co2) || 0,
			dev_eui: String(row.dev_eui ?? ''),
			alerts: Array.isArray(row.alerts) ? (row.alerts as AirRow['alerts']) : [],
			cw_air_annotations:
				noteOverrides[String(row.created_at ?? '')] ??
				(Array.isArray(row.cw_air_annotations)
					? row.cw_air_annotations.map((annotation) => ({
							id: String(
								annotation.id ?? `${annotation.created_at ?? 'note'}-${annotation.note ?? index}`
							),
							note: String(annotation.note ?? ''),
							created_at: String(annotation.created_at ?? '')
						}))
					: [])
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
	let rowSetKey = $derived.by(() => {
		const firstId = rows[0]?.id ?? '';
		const lastId = rows[rows.length - 1]?.id ?? '';
		return `${rows.length}:${firstId}:${lastId}`;
	});
	let tableKey = $derived(`${rowSetKey}:${tableRevision}`);

	let latestTemperature: CwStatCardData = $derived.by(() => {
		return {
			min: historicalData.reduce(
				(min, row) => Math.min(min, Number(row.temperature_c) || 0),
				Infinity
			),
			max: historicalData.reduce(
				(max, row) => Math.max(max, Number(row.temperature_c) || 0),
				-Infinity
			),
			avg:
				historicalData.reduce((sum, row) => sum + (Number(row.temperature_c) || 0), 0) /
				historicalData.length,
			median: (() => {
				const temps = historicalData
					.map((row) => Number(row.temperature_c) || 0)
					.sort((a, b) => a - b);
				const mid = Math.floor(temps.length / 2);
				return temps.length % 2 !== 0 ? temps[mid] : (temps[mid - 1] + temps[mid]) / 2;
			})(),
			stdDev: (() => {
				const temps = historicalData.map((row) => Number(row.temperature_c) || 0);
				const mean = temps.reduce((sum, value) => sum + value, 0) / temps.length;
				const variance = temps.reduce((sum, value) => sum + (value - mean) ** 2, 0) / temps.length;
				return Math.sqrt(variance);
			})(),
			count: historicalData.length,
			lastReading:
				historicalData.length > 0
					? Number(historicalData[historicalData.length - 1].temperature_c) || 0
					: 0,
			trend: 'up'
		};
	});
	let latestHumidity: CwStatCardData = $derived.by(() => {
		return {
			min: historicalData.reduce((min, row) => Math.min(min, Number(row.humidity) || 0), Infinity),
			max: historicalData.reduce((max, row) => Math.max(max, Number(row.humidity) || 0), -Infinity),
			avg:
				historicalData.reduce((sum, row) => sum + (Number(row.humidity) || 0), 0) /
				historicalData.length,
			median: (() => {
				const hums = historicalData.map((row) => Number(row.humidity) || 0).sort((a, b) => a - b);
				const mid = Math.floor(hums.length / 2);
				return hums.length % 2 !== 0 ? hums[mid] : (hums[mid - 1] + hums[mid]) / 2;
			})(),
			stdDev: (() => {
				const hums = historicalData.map((row) => Number(row.humidity) || 0);
				const mean = hums.reduce((sum, value) => sum + value, 0) / hums.length;
				const variance = hums.reduce((sum, value) => sum + (value - mean) ** 2, 0) / hums.length;
				return Math.sqrt(variance);
			})(),
			count: historicalData.length,
			lastReading:
				historicalData.length > 0
					? Number(historicalData[historicalData.length - 1].humidity) || 0
					: 0,
			trend: 'up'
		};
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

	function handleNoteSaved(row: AirRow, note: Note) {
		const deviceKey = devEui;
		const rowKey = row.created_at;
		const existingNotes = noteOverrides[rowKey] ?? row.cw_air_annotations ?? [];

		noteOverridesByDevice = {
			...noteOverridesByDevice,
			[deviceKey]: {
				...(noteOverridesByDevice[deviceKey] ?? {}),
				[rowKey]: [...existingNotes, note]
			}
		};
		tableRevision += 1;
	}
</script>

<div class="air-display">
	<div class="kpi-grid">
		<CwStatCard
			title="Temperature"
			stats={latestTemperature}
			unit="°C"
			accentColor="var(--cw-danger-500)"
		/>
		<CwStatCard title="Humidity" stats={latestHumidity} unit="%" accentColor="var(--cw-info-500)" />
		{#if hasCo2}
			<CwStatCard
				title="CO₂"
				stats={{
					min: historicalData.reduce((min, row) => Math.min(min, Number(row.co2) || 0), Infinity),
					max: historicalData.reduce((max, row) => Math.max(max, Number(row.co2) || 0), -Infinity),
					avg:
						historicalData.reduce((sum, row) => sum + (Number(row.co2) || 0), 0) /
						historicalData.length,
					median: (() => {
						const co2s = historicalData.map((row) => Number(row.co2) || 0).sort((a, b) => a - b);
						const mid = Math.floor(co2s.length / 2);
						return co2s.length % 2 !== 0 ? co2s[mid] : (co2s[mid - 1] + co2s[mid]) / 2;
					})(),
					stdDev: (() => {
						const co2s = historicalData.map((row) => Number(row.co2) || 0);
						const mean = co2s.reduce((sum, value) => sum + value, 0) / co2s.length;
						const variance =
							co2s.reduce((sum, value) => sum + (value - mean) ** 2, 0) / co2s.length;
						return Math.sqrt(variance);
					})(),
					count: historicalData.length,
					lastReading:
						historicalData.length > 0
							? Number(historicalData[historicalData.length - 1].co2) || 0
							: 0,
					trend: 'up'
				}}
				unit="ppm"
				accentColor="purple"
			/>
		{/if}
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
			{#key tableKey}
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
								{new Date(row.created_at).toLocaleString()}
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
									<Icon src={CHECK_CIRCLE_ICON} alt={m.dashboard_no_alerts_alt()} preserveColor />
								{/if}
							{:else}
								{defaultValue}
							{/if}
						</div>
					{/snippet}
					{#snippet rowActions(row: AirRow)}
						<NotesCreateDialog
							{row}
							dev_eui={row.dev_eui || devEui}
							onSaved={(note) => handleNoteSaved(row, note)}
						/>
						{#if row.cw_air_annotations && row.cw_air_annotations.length > 0}
							<NotesViewDialog {row} />
						{/if}
					{/snippet}
				</CwDataTable>
			{/key}
		</CwCard>
	{:else if !loading}
		<CwCard title={m.display_no_data()} elevated>
			<p>{m.display_no_air_quality_data_selected_range()}</p>
		</CwCard>
	{/if}
</div>
