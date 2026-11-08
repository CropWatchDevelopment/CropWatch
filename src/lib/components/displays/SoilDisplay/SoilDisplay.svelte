<!--
  SoilDisplay.svelte — Display component for cw_soil_data.

  Renders the above / below ground panel (a light strip, then the air readings
  above the ground line and the soil readings below it, each with its low,
  average and high for the range), the VPD, PPFD and DLI panels for soil
  boards that also measure the air and light, and a sortable data table. The
  readings over time are in the device page's main chart. A reading a probe
  did not report stays empty ("—"), never 0.

  With a crop set (device settings), its growing targets drive a targets card
  (day or night targets, by the sun at the location), the VPD target band, the
  DLI target and history, and the PPFD target for the current hour: the hour's
  share of the daily light goal, spread on the sun's course for the location
  and date (06:00–16:00 when the location has no latitude/longitude).
-->
<script lang="ts">
	import {
		CwAboveBelowChart,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		CwPPFDChart,
		CwVPDChart,
		CwDliCard,
		CwButton,
		CwChip
	} from '@cropwatchdevelopment/cwui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppNotice } from '$lib/components/layout';
	import { canManage } from '$lib/constants/permissions';
	import { getServices } from '$lib/services/context';
	import {
		cropDisplayName,
		cropTarget,
		vaporPressureDeficit,
		type DayPeriod
	} from '$lib/agronomy/crop-targets';
	import {
		dayLightProfile,
		isDaylight,
		lightEndsAt,
		lightShareSoFar,
		ppfdTargetForHour
	} from '$lib/agronomy/light-targets';
	import AiRecommendationCard from './AiRecommendationCard.svelte';
	import { DliHistory } from './dli-history.svelte';
	import { buildCropTargetRows, targetStatusLabel, targetStatusTone } from './soil-crop-targets';
	import { buildSoilLight, buildSoilPanel, soilPanelSubtitle } from './soil-panel';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { m } from '$lib/paraglide/messages.js';
	import { getIntlLocale } from '$lib/i18n/format';
	import {
		cwAboveBelowChartLabels,
		cwDataTableLabels,
		cwPpfdChartLabels,
		cwVpdChartLabels
	} from '$lib/i18n/cwuiLabels';
	import { getAppContext } from '$lib/appContext.svelte';
	import { labelFor } from '$lib/sensor-labels';
	import { formatSensorMeasurement, resolveDisplayUnit } from '$lib/units';
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

	let {
		devEui,
		locationId,
		latestData,
		historicalData,
		loading,
		permissionLevel,
		crop = null,
		coordinates = null,
		aiReport = null
	}: DeviceDisplayProps = $props();

	const app = getAppContext();
	const dliHistory = new DliHistory({ telemetry: getServices().telemetry });

	// The hour's light target and the day/night targets follow the clock.
	let now = $state(Date.now());
	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(timer);
	});
	let nowDate = $derived(new Date(now));
	let lightProfile = $derived(dayLightProfile(nowDate, coordinates));
	let period = $derived<DayPeriod>(isDaylight(nowDate, coordinates) ? 'day' : 'night');
	let cropName = $derived(crop ? cropDisplayName(crop, getIntlLocale()) : '');

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toSoilRows(historicalData));
	// The panel and the charts read oldest-first; the history is newest-first.
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

	// Above / below ground panel: every reading in the user's units, judged
	// against the crop's targets for this time of day.
	let panel = $derived(
		buildSoilPanel({
			rows: chronologicalRows,
			latest,
			crop,
			period,
			preferences: app.preferences
		})
	);

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

	// ---- VPD and light -----------------------------------------------------------

	let dli = $derived(dliToday(fieldSeries(chronologicalRows, 'ppfd'), nowDate));

	// Boards with a light sensor get a week of daily DLI totals (loaded once a day).
	$effect(() => {
		if (latest.ppfd) void dliHistory.load(devEui, nowDate);
	});

	// ---- Crop targets ----------------------------------------------------------

	let vpd = $derived(
		vaporPressureDeficit(latest.air_temperature_c?.value, latest.air_humidity?.value)
	);
	let targetRows = $derived(
		crop
			? buildCropTargetRows({
					crop,
					period,
					readings: Object.fromEntries(
						SOIL_FIELDS.map((field) => [field, latest[field]?.value ?? null])
					),
					vpd,
					preferences: app.preferences
				})
			: []
	);
	let targetsNote = $derived(
		coordinates
			? period === 'day'
				? m.soil_crop_targets_day()
				: m.soil_crop_targets_night()
			: period === 'day'
				? m.soil_crop_targets_day_fallback()
				: m.soil_crop_targets_night_fallback()
	);
	let vpdTarget = $derived(cropTarget(crop, 'vpd', 'day'));

	// Light: the daily goal (DLI band), and the PPFD the current hour needs to
	// stay on course for it. An open-ended goal tops out at light saturation.
	let dliTarget = $derived.by(() => {
		const target = cropTarget(crop, 'dli', 'day');
		return target && (target.optimal_min !== null || target.optimal_max !== null) ? target : null;
	});
	let ppfdHour = $derived.by(() => {
		if (!dliTarget) return null;
		const hour = ppfdTargetForHour(
			nowDate,
			{ min: dliTarget.optimal_min, max: dliTarget.optimal_max },
			lightProfile
		);
		const saturation = cropTarget(crop, 'ppfd', 'day')?.optimal_max ?? null;
		if (!hour || hour.max !== null || saturation === null) return hour;
		return { ...hour, max: Math.max(hour.min ?? 0, saturation) };
	});
	let ppfdLabels = $derived.by(() => {
		const labels = cwPpfdChartLabels();
		if (!dliTarget) return labels;
		const clock = new Intl.DateTimeFormat(getIntlLocale(), { hour: '2-digit', minute: '2-digit' });
		return {
			...labels,
			targetRange: ppfdHour
				? m.soil_ppfd_target_hour({
						from: clock.format(ppfdHour.from),
						to: clock.format(ppfdHour.to)
					})
				: m.soil_ppfd_target_night()
		};
	});

	// Today's DLI is judged only once the day's light is over; until then the
	// card says how much should have fallen by now.
	let lightSoFar = $derived(lightShareSoFar(nowDate, lightProfile));
	let dayLightOver = $derived(lightProfile.total > 0 && lightSoFar >= 0.999);

	// How far through its light the day is: the DLI card's top right then shows
	// what today still needs (the PPFD card covers the current hour).
	let dayProgress = $derived(
		dliTarget && latest.ppfd
			? {
					lightSoFar,
					lightEndsAt: lightEndsAt(nowDate, coordinates),
					assumed: !coordinates
				}
			: null
	);

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
	<!-- Light, air and soil at a glance; readings the board lacks (pH) are left out. -->
	<CwAboveBelowChart
		locale={getIntlLocale()}
		labels={cwAboveBelowChartLabels()}
		subtitle={soilPanelSubtitle(rows, nowDate)}
		targetName={cropName}
		loading={loading && rows.length === 0}
		noData={!loading && rows.length === 0 ? m.display_awaiting_sensor_data() : undefined}
		light={buildSoilLight({ rows: chronologicalRows, latest, dli, dliTarget })}
		air={panel.air}
		ground={panel.ground}
	/>

	{#if crop}
		<CwCard title={m.soil_crop_targets_title({ crop: cropName })} subtitle={targetsNote} elevated>
			<div class="crop-targets">
				<table>
					<thead>
						<tr>
							<th scope="col">{m.soil_crop_targets_metric()}</th>
							<th scope="col">{m.soil_crop_targets_now()}</th>
							<th scope="col">{m.soil_crop_targets_target()}</th>
							<th scope="col">{m.soil_crop_targets_status()}</th>
						</tr>
					</thead>
					<tbody>
						{#each targetRows as row (row.key)}
							<tr>
								<th scope="row">{row.label}</th>
								<td>{row.now}</td>
								<td>{row.target}</td>
								<td>
									{#if row.daytimeOnly}
										<span class="crop-targets__muted">{m.soil_crop_targets_daytime_only()}</span>
									{:else if row.status}
										<CwChip
											label={targetStatusLabel(row.status)}
											tone={targetStatusTone(row.status)}
											variant="soft"
										/>
									{:else}
										<span class="crop-targets__muted">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</CwCard>
	{:else if !loading}
		<AppNotice tone="info">
			<p>{m.soil_crop_not_set()}</p>
			{#if canManage(permissionLevel) && locationId && devEui}
				<CwButton
					variant="secondary"
					size="sm"
					onclick={() =>
						goto(
							resolve('/locations/[location_id]/devices/[dev_eui]/settings', {
								location_id: locationId,
								dev_eui: devEui
							})
						)}
				>
					{m.soil_crop_not_set_action()}
				</CwButton>
			{/if}
		</AppNotice>
	{/if}

	<!-- VPD and light panels: each shows "awaiting sensor data" only while it has
	     none. They pair up on desktop and stack on mobile. -->
	<div class="chart-pair">
		<CwVPDChart
			locale={getIntlLocale()}
			labels={cwVpdChartLabels()}
			airTemperatureC={latest.air_temperature_c?.value ?? null}
			relativeHumidity={latest.air_humidity?.value ?? null}
			useF={app.preferences?.temperature_unit === 'fahrenheit'}
			targetMin={vpdTarget?.optimal_min ?? null}
			targetMax={vpdTarget?.optimal_max ?? null}
			noData={latest.air_temperature_c && latest.air_humidity
				? false
				: m.display_awaiting_sensor_data()}
		/>
		<div class="chart-pair__stack">
			<CwPPFDChart
				locale={getIntlLocale()}
				labels={ppfdLabels}
				plant={cropName}
				current={latest.ppfd?.value ?? null}
				targetMin={ppfdHour?.min ?? null}
				targetMax={ppfdHour?.max ?? null}
				updatedAt={latest.ppfd?.at || undefined}
				dliToday={dli}
				noData={latest.ppfd ? undefined : m.display_awaiting_sensor_data()}
			/>
			<CwDliCard
				locale={getIntlLocale()}
				{cropName}
				value={dli}
				targetMin={dliTarget?.optimal_min ?? null}
				targetMax={dliTarget?.optimal_max ?? null}
				showStatus={!dliTarget || dayLightOver}
				day={dayProgress}
				history={dliHistory.days.length > 0 ? dliHistory.days : undefined}
				noData={dli === null ? m.display_awaiting_sensor_data() : false}
			/>
		</div>
	</div>

	<!-- The newest AI growing advice, right above the history it was written from. -->
	{#if aiReport}
		<AiRecommendationCard report={aiReport} />
	{/if}

	<!-- History table — always last. -->
	{#if !loading && rows.length > 0}
		<CwCard title={m.display_history()} subtitle={m.display_searchable_sortable()} elevated>
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
	/* The DLI card grows to fill the column down to the VPD's bottom edge,
	   keeping the desktop layout flush/square. No-op in the single-column flow
	   where the stack has no extra height to distribute. */
	.chart-pair__stack > :global(.cw-dli-card) {
		flex: 1;
	}
	@media (min-width: 64rem) {
		.chart-pair {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}
	.crop-targets {
		overflow-x: auto;
	}
	.crop-targets table {
		border-collapse: collapse;
		font-variant-numeric: tabular-nums;
		width: 100%;
	}
	.crop-targets th,
	.crop-targets td {
		border-bottom: 1px solid var(--cw-border-default);
		padding: 0.5rem 0.75rem;
		text-align: left;
		white-space: nowrap;
	}
	.crop-targets thead th {
		color: var(--cw-text-muted);
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
		letter-spacing: 0.05em;
		text-transform: uppercase;
	}
	.crop-targets tbody th {
		font-weight: var(--cw-font-semibold);
	}
	.crop-targets tbody tr:last-child > * {
		border-bottom: none;
	}
	.crop-targets__muted {
		color: var(--cw-text-muted);
	}
</style>
