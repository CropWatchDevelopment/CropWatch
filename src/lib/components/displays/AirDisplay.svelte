<!--
  AirDisplay.svelte — Display component for cw_air_data.

  Renders a toolbar (back, range selectors, date picker, CSV, settings),
  KPI cards (temperature, humidity, CO₂), a line chart with
  temperature + humidity overlay, a heatmap, and a sortable data table.
-->
<script lang="ts">
	import {
		CwCard,
		CwLineChart,
		CwHeatmap,
		CwDataTable,
		CwButton,
		CwDateTimeRangePicker,
		CwDuration,
		type CwColumnDef,
		type CwLineChartDataPoint,
		type CwLineChartSecondaryDataPoint,
		type CwHeatmapDataPoint,
		type CwTableQuery,
		type CwTableResult,
		type CwRangeDateValue
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
	import { goto } from '$app/navigation';
	import { ApiService } from '$lib/api/api.service';
	import { downloadCsv } from '../../../routes/locations/[location_id]/devices/[dev_eui]/csvExport';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';

	let {
		devEui,
		locationId,
		locationName,
		latestData,
		historicalData,
		loading: initialLoading,
		authToken
	}: DeviceDisplayProps = $props();

	// ---- Toolbar state ---------------------------------------------------------

	let selectedRangeHours = $state(24);
	let dateRange = $state<CwRangeDateValue | undefined>(undefined);
	let fetchedData = $state<Record<string, unknown>[] | null>(null);
	let fetching = $state(false);

	let activeData = $derived(fetchedData ?? historicalData);
	let loading = $derived(initialLoading || fetching);

	function selectRange(hours: number) {
		selectedRangeHours = hours;
		dateRange = undefined;
		fetchDataForRange(hours);
	}

	function handleDateRangeChange(value: any) {
		if (value?.start && value?.end) {
			dateRange = value as CwRangeDateValue;
			selectedRangeHours = 0;
			fetchDataForCustomRange(value.start, value.end);
		}
	}

	async function fetchDataForRange(hours: number) {
		if (!authToken) return;
		fetching = true;
		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const end = new Date();
			const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: start.toISOString(),
				end: end.toISOString(),
				take: 1000
			});
			fetchedData = Array.isArray(result) ? result : (result as any)?.data ?? [];
		} catch (err) {
			console.error('Failed to fetch device data:', err);
		} finally {
			fetching = false;
		}
	}

	async function fetchDataForCustomRange(start: Date | string, end: Date | string) {
		if (!authToken) return;
		fetching = true;
		try {
			const api = new ApiService({ fetchFn: fetch, authToken });
			const result = await api.getDeviceDataWithinRange(devEui, {
				start: new Date(start).toISOString(),
				end: new Date(end).toISOString(),
				take: 1000
			});
			fetchedData = Array.isArray(result) ? result : (result as any)?.data ?? [];
		} catch (err) {
			console.error('Failed to fetch device data:', err);
		} finally {
			fetching = false;
		}
	}

	function handleCsvDownload() {
		downloadCsv(rows, locationName, devEui, selectedRangeHours || 'custom');
	}

	// ---- Air-specific row shape ------------------------------------------------

	interface AirRow {
		id: string;
		created_at: string;
		temperature_c: number;
		humidity: number;
		co2: number;
	}

	function toAirRows(raw: Record<string, unknown>[]): AirRow[] {
		return raw.map((row, i) => ({
			id: String(row.id ?? row.data_id ?? `${row.created_at}-${i}`),
			created_at: String(row.created_at ?? ''),
			temperature_c: Number(row.temperature_c) || 0,
			humidity: Number(row.humidity) || 0,
			co2: Number(row.co2) || 0
		}));
	}

	// ---- Columns ---------------------------------------------------------------

	const columns: CwColumnDef<AirRow>[] = [
		{ key: 'created_at', header: 'Timestamp', sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: 'Temp (°C)', sortable: true, width: '8rem' },
		{ key: 'humidity', header: 'Humidity (%)', sortable: true, width: '9rem' },
		{ key: 'co2', header: 'CO₂ (ppm)', sortable: true, width: '9rem' }
	];

	// ---- Derived state ---------------------------------------------------------

	let rows = $derived(toAirRows(activeData));

	let latest = $derived({
		temperature_c: Number(latestData?.temperature_c) || 0,
		humidity: Number(latestData?.humidity) || 0,
		co2: Number(latestData?.co2) || 0,
		created_at: String(latestData?.created_at ?? '')
	});

	let lastSeen = $derived(latestData?.created_at ? String(latestData.created_at) : null);

	let lineSeries = $derived<(CwLineChartDataPoint & { timestamp: string })[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			created_at: p.created_at,
			value: p.temperature_c
		}))
	);

	let secondarySeries = $derived<(CwLineChartSecondaryDataPoint & { timestamp: string })[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			created_at: p.created_at,
			value: p.humidity
		}))
	);

	let heatmapSeries = $derived<(CwHeatmapDataPoint & { timestamp: string })[]>(
		rows.map((p) => ({
			timestamp: p.created_at,
			created_at: p.created_at,
			value: p.temperature_c
		}))
	);

	// ---- Table loader ----------------------------------------------------------

	let tableLoading = $state(false);

	async function loadTableData(query: CwTableQuery): Promise<CwTableResult<AirRow>> {
		tableLoading = true;
		try {
			let filtered = [...rows].reverse();

			if (query.search.trim()) {
				const search = query.search.trim().toLowerCase();
				filtered = filtered.filter((r) =>
					[
						new Date(r.created_at).toLocaleString(),
						r.temperature_c.toFixed(2),
						r.humidity.toFixed(2),
						String(r.co2)
					]
						.join(' ')
						.toLowerCase()
						.includes(search)
				);
			}

			if (query.sort) {
				const dir = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((a, b) => {
					const av = a[query.sort!.column as keyof AirRow];
					const bv = b[query.sort!.column as keyof AirRow];
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

<!-- Toolbar card -->
<div>
	<CwButton
		variant="primary"
		onclick={() => goto(`/locations/${encodeURIComponent(locationId)}`)}
	>
		← Back to Location
	</CwButton>
</div>

<CwCard title={`Device ${devEui.toUpperCase()}`} subtitle={`Location ${locationName}`} elevated>
	{#snippet subtitleSlot()}
		{#if lastSeen}
			<span>
				• Last updated:
				<CwDuration from={lastSeen} alarmAfterMinutes={10.5} class="subtitle-duration" />
			</span>
		{/if}
	{/snippet}

	<div class="device-toolbar">
		<div class="device-toolbar__range-buttons">
			<CwButton
				variant={selectedRangeHours === 24 ? 'primary' : 'secondary'}
				size="sm"
				onclick={() => selectRange(24)}
			>
				24h
			</CwButton>
			<CwButton
				variant={selectedRangeHours === 48 ? 'primary' : 'secondary'}
				size="sm"
				onclick={() => selectRange(48)}
			>
				48h
			</CwButton>
			<CwButton
				variant={selectedRangeHours === 72 ? 'primary' : 'secondary'}
				size="sm"
				onclick={() => selectRange(72)}
			>
				72h
			</CwButton>
		</div>

		<div class="device-toolbar__date-picker">
			<CwDateTimeRangePicker
				mode="range"
				granularity="day"
				placeholder="Select date range…"
				value={dateRange}
				onchange={handleDateRangeChange}
			/>
		</div>

		<div class="device-toolbar__actions">
			<CwButton variant="secondary" size="sm" onclick={handleCsvDownload}>
				<img src={DOWNLOAD_ICON} alt="" class="toolbar-icon" />
				CSV
			</CwButton>
			<CwButton
				variant="secondary"
				size="sm"
				onclick={() =>
					goto(
						`/locations/${encodeURIComponent(locationId)}/devices/${encodeURIComponent(devEui)}/settings`
					)}
			>
				<img src={SETTINGS_ICON} alt="" class="toolbar-icon" />
				Settings
			</CwButton>
		</div>
	</div>
</CwCard>

<div class="air-display overflow-y-scroll">
	<!-- KPI cards -->
	<div class="kpi-grid">
		<CwCard title="Current Temperature" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.temperature_c.toFixed(1)}<span>°C</span></p>
		</CwCard>

		<CwCard title="Current Humidity" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.humidity.toFixed(1)}<span>%</span></p>
		</CwCard>

		<CwCard title="Current CO₂" subtitle="Latest reading" elevated>
			<p class="kpi-value">{latest.co2}<span>ppm</span></p>
		</CwCard>
	</div>

	{#if !loading && rows.length > 0}
		<div class="flex flex-row w-full gap-4">
			<!-- Charts -->
			<CwCard title="Temperature & Humidity" class="w-full" subtitle="Time series" elevated>
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

			<CwCard title="Temperature Heatmap" class="w-full" subtitle="Hourly density" elevated>
				<CwHeatmap
					data={heatmapSeries}
					days={2}
					unit="°C"
					title=""
					rowHeight={18}
					colors={['#0ea5e9', '#84cc16', '#f97316']}
				/>
			</CwCard>
		</div>

		<!-- Data table -->
		<CwCard title="Telemetry Table" subtitle="Searchable, sortable data" elevated>
			<CwDataTable {columns} loadData={loadTableData} loading={tableLoading} rowKey="id" searchable>
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
			</CwDataTable>
		</CwCard>
	{:else if !loading}
		<CwCard title="No Data" elevated>
			<p>No air quality data available for the selected range.</p>
		</CwCard>
	{/if}
</div>

<style>
	.device-toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.75rem;
	}

	.device-toolbar__range-buttons {
		display: flex;
		gap: 0.375rem;
	}

	.device-toolbar__date-picker {
		display: none;
	}

	.device-toolbar__actions {
		display: flex;
		gap: 0.375rem;
		margin-left: auto;
	}

	.toolbar-icon {
		width: 1rem;
		height: 1rem;
	}

	@media (min-width: 1024px) {
		.device-toolbar__date-picker {
			display: block;
		}
	}

	.air-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
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
