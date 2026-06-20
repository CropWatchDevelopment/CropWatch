<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		CwDuration,
		CwHeatmap,
		CwStatCard,
		CwWindCompass,
		type CwColumnDef,
		type CwHeatmapDataPoint,
		type CwStatCardData,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import { cwDataTableLabels, cwHeatmapLabels, cwWindCompassLabels } from '$lib/i18n/cwuiLabels';
	import './AirDisplay.css';
	import NotesCreateDialog from './dialogs/notes-create-dialog.svelte';
	import type { AirRow } from './interfaces/AirRow.interface';
	import type { Note } from './interfaces/note.interface';
	import NotesViewDialog from './dialogs/notes-view-dialog.svelte';
	import { parseAirNotesResponse } from './utils/air-notes';
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

	const ALARM_AFTER_MINUTES = 10.2;

	let { latestData, historicalData, loading, devEui, authToken }: DeviceDisplayProps = $props();
	let noteOverridesByDevice = $state<Record<string, Record<string, Note[]>>>({});
	let tableRevision = $state(0);
	let noteOverrides = $derived(noteOverridesByDevice[devEui] ?? {});
	// CO2 is reported on a slower cadence than temp/humidity on some devices (the
	// CW-air-co2 device sends it in ~1 of 3 uplinks), so many rows carry a null
	// co2. Gate the card on "has at least one real reading" — the old `.every(...)`
	// check hid the card whenever a single null/zero row appeared — and compute the
	// stats over only the rows that actually carry a reading (treating null as 0
	// otherwise drags min to 0 and skews the average).
	let co2Values = $derived(
		historicalData
			.map((row) => Number(row.co2))
			.filter((value) => Number.isFinite(value) && value > 0)
	);
	let hasCo2 = $derived(co2Values.length > 0);
	let latestCo2: CwStatCardData = $derived.by(() => {
		if (co2Values.length === 0) {
			return { min: 0, max: 0, avg: 0, median: 0, stdDev: 0, count: 0, lastReading: 0, trend: 'up' };
		}
		const sorted = [...co2Values].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
		const mean = co2Values.reduce((sum, value) => sum + value, 0) / co2Values.length;
		const variance =
			co2Values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / co2Values.length;
		// Most-recent row that actually carries CO2 (historicalData is newest-first).
		const lastWithCo2 = historicalData.find(
			(row) => Number.isFinite(Number(row.co2)) && Number(row.co2) > 0
		);
		return {
			min: sorted[0],
			max: sorted[sorted.length - 1],
			avg: mean,
			median,
			stdDev: Math.sqrt(variance),
			count: co2Values.length,
			lastReading: lastWithCo2 ? Number(lastWithCo2.co2) : sorted[sorted.length - 1],
			trend: 'up'
		};
	});

	// Weather-station wind: render the compass only when the latest reading
	// carries both speed and direction (stored as text, so coerce to number).
	let windDirection = $derived(
		latestData?.wind_direction != null ? Number(latestData.wind_direction) : null
	);
	let windSpeed = $derived(latestData?.wind_speed != null ? Number(latestData.wind_speed) : null);
	let hasWind = $derived(
		windDirection !== null &&
			Number.isFinite(windDirection) &&
			windSpeed !== null &&
			Number.isFinite(windSpeed)
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
				noteOverrides[String(row.created_at ?? '')] ?? parseAirNotesResponse(row.cw_air_annotations)
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
			lastReading: historicalData.length > 0 ? Number(historicalData.at(0)?.temperature_c) || 0 : 0,
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
			lastReading: historicalData.length > 0 ? Number(historicalData.at(0)?.humidity) || 0 : 0,
			trend: 'up'
		};
	});

	type HeatmapMetricKey = 'temperature' | 'humidity' | 'co2';

	interface HeatmapMetric {
		key: HeatmapMetricKey;
		label: string;
		unit: string;
		colors: [string, string, string];
		// Returns the cell value, or null to omit the row (rendered as a no-data gap).
		value: (row: AirRow) => number | null;
	}

	// Metrics the heatmap can render from the data already loaded. Temperature and
	// humidity are always reported; CO2 only appears when the device actually sent
	// readings (see `hasCo2`). Switching metric just re-points the heatmap value —
	// no re-fetch.
	let heatmapMetrics: HeatmapMetric[] = $derived.by(() => {
		const metrics: HeatmapMetric[] = [
			{
				key: 'temperature',
				label: m.rule_subject_temperature(),
				unit: '°C',
				colors: ['#0ea5e9', '#84cc16', '#f97316'],
				value: (row) => row.temperature_c
			},
			{
				key: 'humidity',
				label: m.rule_subject_humidity(),
				unit: '%',
				colors: ['#bae6fd', '#38bdf8', '#1d4ed8'],
				value: (row) => row.humidity
			}
		];
		if (hasCo2) {
			metrics.push({
				key: 'co2',
				label: m.rule_subject_co2(),
				unit: 'ppm',
				colors: ['#84cc16', '#f59e0b', '#dc2626'],
				// CO2 is sent on only ~1 of 3 uplinks, so most rows carry no reading
				// (co2 === 0). Omit those so the heatmap shows gaps, not fake-low cells.
				value: (row) => (row.co2 > 0 ? row.co2 : null)
			});
		}
		return metrics;
	});

	let selectedMetric = $state<HeatmapMetricKey>('temperature');
	// Fall back to the first metric when the selection is unavailable (e.g. CO2 was
	// selected then dropped out of the data). `heatmapMetrics` always has ≥1 entry.
	let activeMetric = $derived(
		heatmapMetrics.find((metric) => metric.key === selectedMetric) ?? heatmapMetrics[0]
	);

	let heatmapSeries = $derived<(CwHeatmapDataPoint & { timestamp: string })[]>(
		rows.flatMap((row) => {
			const value = activeMetric.value(row);
			return value === null
				? []
				: [{ timestamp: row.created_at, created_at: row.created_at, value }];
		})
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
			title={m.display_temperature()}
			stats={latestTemperature}
			unit="°C"
			accentColor="var(--cw-danger-500)"
			labels={{
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
			}}
		/>
		<CwStatCard
			title={m.display_temperature_humidity()}
			stats={latestHumidity}
			unit="%"
			accentColor="var(--cw-info-500)"
			labels={{
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
			}}
		/>
		{#if hasCo2}
			<CwStatCard
				title="CO₂"
				labels={{
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
				}}
				stats={latestCo2}
				unit="ppm"
				accentColor="purple"
			/>
		{/if}
	</div>

	{#if !loading && rows.length > 0}
		<div class="air-wind-row" class:air-wind-row--paired={hasWind} id="HeatMapDiv">
			<CwCard title={activeMetric.label} subtitle={m.display_reading_density()} elevated>
				<div class="heatmap-metric-toggle">
					{#each heatmapMetrics as metric (metric.key)}
						<CwButton
							size="sm"
							variant={activeMetric.key === metric.key ? 'info' : 'secondary'}
							onclick={() => (selectedMetric = metric.key)}
						>
							{metric.label}
						</CwButton>
					{/each}
				</div>
				<CwHeatmap
					labels={cwHeatmapLabels()}
					data={heatmapSeries}
					days={heatmapDays}
					unit={activeMetric.unit}
					title=""
					rowHeight={18}
					colors={activeMetric.colors}
				/>
			</CwCard>

			{#if hasWind}
				<CwWindCompass
					direction={windDirection}
					speed={windSpeed}
					unit="m/s"
					labels={cwWindCompassLabels()}
				/>
			{/if}
		</div>

		<CwCard title={m.display_telemetry_table()} elevated>
			{#key tableKey}
				<CwDataTable
					labels={cwDataTableLabels()}
					{columns}
					loadData={loadTableData}
					loading={tableLoading}
					rowKey="id"
					rowActionsHeader={m.common_actions()}
					searchable
				>
					{#snippet cell(row: AirRow, col: CwColumnDef<AirRow>, defaultValue: string)}
						<div class="text-xl">
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

<style>
	/* Heatmap with the wind compass beside it. Mobile: stacked vertically.
	   Tablet/desktop (≥48rem) when wind data exists: side by side. */
	.air-wind-row {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.air-wind-row > :global(*) {
		min-width: 0;
	}
	/* Metric select buttons above the heatmap. */
	.heatmap-metric-toggle {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	@media (min-width: 48rem) {
		.air-wind-row--paired {
			display: grid;
			grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
			align-items: start;
		}
	}
</style>
