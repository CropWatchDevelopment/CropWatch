<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		CwHeatmap,
		CwStatCard,
		CwWindCompass,
		type CwColumnDef,
		type CwHeatmapDataPoint,
		type CwStatCardData,
		type CwWindSpeedUnit
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import {
		cwDataTableLabels,
		cwHeatmapLabels,
		cwStatCardLabels,
		cwWindCompassLabels
	} from '$lib/i18n/cwuiLabels';
	import { computeStats } from '$lib/utils/computeStats';
	import { createClientTableLoader } from '$lib/utils/clientTableLoader';
	import './AirDisplay.css';
	import NotesCreateDialog from './dialogs/notes-create-dialog.svelte';
	import type { AirRow } from './interfaces/AirRow.interface';
	import type { Note } from './interfaces/note.interface';
	import NotesViewDialog from './dialogs/notes-view-dialog.svelte';
	import { parseAirNotesResponse } from './utils/air-notes';
	import Icon from '$lib/components/Icon.svelte';
	import CHECK_CIRCLE_ICON from '$lib/images/icons/check_circle.svg';
	import { getAppContext } from '$lib/appContext.svelte';
	import { convertSensorValue, formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';

	const app = getAppContext();

	const HEATMAP_FALLBACK_DAYS = 1;
	const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

	const columns: CwColumnDef<AirRow>[] = [
		{ key: 'created_at', header: m.display_timestamp(), sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: m.rule_subject_temperature(), sortable: true, width: '8rem' },
		{ key: 'humidity', header: m.rule_subject_humidity(), sortable: true, width: '9rem' },
		{ key: 'co2', header: m.rule_subject_co2(), sortable: true, width: '9rem' },
		{ key: 'alerts', header: m.status_alerts(), width: '3rem' }
	];

	let { latestData, historicalData, loading, devEui }: DeviceDisplayProps = $props();
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

	// The Air stat cards render even with no history, so keep the pre-existing
	// all-zero placeholder instead of computeStats' empty object.
	const EMPTY_STATS: CwStatCardData = {
		min: 0,
		max: 0,
		avg: 0,
		median: 0,
		stdDev: 0,
		count: 0,
		lastReading: 0,
		trend: 'up'
	};

	let latestCo2: CwStatCardData = $derived.by(() => {
		if (co2Values.length === 0) return EMPTY_STATS;
		// Convert first so every stat is in the display unit.
		const values = co2Values.map((value) => convertSensorValue('co2', value, app.preferences));
		// Most-recent row that actually carries CO2 (historicalData is newest-first).
		const lastWithCo2 = historicalData.find(
			(row) => Number.isFinite(Number(row.co2)) && Number(row.co2) > 0
		);
		return {
			...computeStats(values),
			lastReading: convertSensorValue(
				'co2',
				lastWithCo2 ? Number(lastWithCo2.co2) : co2Values[co2Values.length - 1],
				app.preferences
			),
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
	// CwWindCompass wants its own unit union ('knots', not 'kt'); the speed we pass
	// is already converted to that unit.
	const WIND_COMPASS_UNIT: Record<string, CwWindSpeedUnit> = {
		m_s: 'm/s',
		km_h: 'km/h',
		mph: 'mph',
		kt: 'knots'
	};
	let windCompassUnit = $derived<CwWindSpeedUnit>(
		WIND_COMPASS_UNIT[app.preferences?.wind_speed_unit ?? 'm_s'] ?? 'm/s'
	);
	let windSpeedDisplay = $derived(
		windSpeed !== null ? convertSensorValue('wind_speed', windSpeed, app.preferences) : null
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

	let temperatureUnit = $derived(resolveDisplayUnit('temperature_c', app.preferences));
	let co2Unit = $derived(resolveDisplayUnit('co2', app.preferences));
	let latestTemperature: CwStatCardData = $derived.by(() => {
		// Convert first so every stat (incl. stdDev/range) is in the display unit.
		const temps = historicalData.map((row) =>
			convertSensorValue('temperature_c', Number(row.temperature_c) || 0, app.preferences)
		);
		if (temps.length === 0) return EMPTY_STATS;
		return {
			...computeStats(temps),
			// historicalData is newest-first.
			lastReading: temps[0],
			trend: 'up'
		};
	});
	let latestHumidity: CwStatCardData = $derived.by(() => {
		const hums = historicalData.map((row) => Number(row.humidity) || 0);
		// Guard: an empty history previously produced NaN/Infinity stats here.
		if (hums.length === 0) return EMPTY_STATS;
		return {
			...computeStats(hums),
			// historicalData is newest-first.
			lastReading: hums[0],
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
				unit: resolveDisplayUnit('temperature_c', app.preferences),
				colors: ['#0ea5e9', '#84cc16', '#f97316'],
				value: (row) => convertSensorValue('temperature_c', row.temperature_c, app.preferences)
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
				unit: resolveDisplayUnit('co2', app.preferences),
				colors: ['#84cc16', '#f59e0b', '#dc2626'],
				// CO2 is sent on only ~1 of 3 uplinks, so most rows carry no reading
				// (co2 === 0). Omit those so the heatmap shows gaps, not fake-low cells.
				value: (row) => (row.co2 > 0 ? convertSensorValue('co2', row.co2, app.preferences) : null)
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

	const loadTableData = createClientTableLoader<AirRow>(() => rows, {
		reverse: true,
		searchText: (row) =>
			[
				new Date(row.created_at).toLocaleString(),
				row.temperature_c.toFixed(2),
				row.humidity.toFixed(2),
				String(row.co2)
			].join(' '),
		onLoadingChange: (value) => (tableLoading = value)
	});

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
			unit={temperatureUnit}
			accentColor="var(--cw-danger-500)"
			labels={cwStatCardLabels()}
		/>
		<CwStatCard
			title={m.display_temperature_humidity()}
			stats={latestHumidity}
			unit="%"
			accentColor="var(--cw-info-500)"
			labels={cwStatCardLabels()}
		/>
		{#if hasCo2}
			<CwStatCard
				title="CO₂"
				labels={cwStatCardLabels()}
				stats={latestCo2}
				unit={co2Unit}
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
					speed={windSpeedDisplay}
					unit={windCompassUnit}
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
								{formatSensorMeasurement('temperature_c', row.temperature_c, app.preferences)
									.display}
							{:else if col.key === 'humidity'}
								{formatSensorMeasurement('humidity', row.humidity, app.preferences).display}
							{:else if col.key === 'co2'}
								{formatSensorMeasurement('co2', row.co2, app.preferences).display}
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
