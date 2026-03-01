<script lang="ts">
	import './devices-page.css';
	import {
		CwButton,
		CwCard,
		CwChip,
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
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { downloadCsv } from './csvExport';
	import { getAppContext } from '$lib/appContext.svelte';

	let { data }: { data: any } = $props();
	const app = getAppContext();

	type RangeHours = 24 | 48 | 72;

	interface TelemetryRow {
		id: string;
		created_at: string;
		temperature_c: number;
		humidity: number;
		co2: number;
		alertRaised?: boolean;
	}

	const RANGE_OPTIONS: RangeHours[] = [24, 48, 72];
	const ALERT_TEMP_THRESHOLD = 23;

	function extractRows(payload: unknown): TelemetryRow[] {
		const raw: Record<string, unknown>[] = Array.isArray(payload)
			? payload
			: (payload as { data?: unknown })?.data
				? ((payload as { data: Record<string, unknown>[] }).data)
				: [];

		return raw.map((row, i) => {
			const temp = Number(row.temperature_c) || 0;
			return {
				id: String(row.id ?? row.data_id ?? `${row.created_at}-${i}`),
				created_at: String(row.created_at ?? ''),
				temperature_c: temp,
				humidity: Number(row.humidity) || 0,
				co2: Number(row.co2) || 0,
				alertRaised: temp >= ALERT_TEMP_THRESHOLD ? true : undefined
			};
		});
	}

	const columns: CwColumnDef<TelemetryRow>[] = [
		{ key: 'created_at', header: 'created_at', sortable: true, width: '13.5rem' },
		{ key: 'temperature_c', header: 'Temp (°C)', sortable: true, width: '8rem' },
		{ key: 'humidity', header: 'Humidity (%)', sortable: true, width: '9rem' },
		{ key: 'co2', header: 'CO₂ (ppm)', sortable: true, width: '9rem' },
		{ key: 'alertRaised', header: 'Alert', sortable: true, width: '12rem' }
	];

	let selectedRangeHours = $state<RangeHours>(24);
	let tableLoading = $state(false);
	let pageSize = $state(12);

	let locationName = $derived(
		app.devices.find((d) => d.dev_eui === page.params.dev_eui)?.location_name ?? 'Unknown'
	);
	let locationId = $derived(page.params.location_id ?? 'location');
	let devEui = $derived(page.params.dev_eui ?? 'device');
	let latestData = $derived(data.latestData);
	let lastSeenLabel = $derived(new Date(latestData?.created_at ?? '').toLocaleString());
	let deviceData = $derived(extractRows(data.deviceData));

	let cutoff = $derived(new Date(Date.now() - selectedRangeHours * 60 * 60 * 1000));
	let selectedTelemetry = $derived(
		deviceData.filter((row) => new Date(row.created_at) >= cutoff)
	);

	// NOTE: cwui CwLineChart/CwHeatmap internally read `.timestamp`, not `.created_at`.
	// We must include both until the library aligns types with implementation.
	let lineSeries = $derived<(CwLineChartDataPoint & { timestamp: string })[]>(
		selectedTelemetry.map((point) => ({
			timestamp: point.created_at,
			created_at: point.created_at,
			value: point.temperature_c,
			alert:
				point.temperature_c >= ALERT_TEMP_THRESHOLD
					? {
							id: `temperature-alert-${point.id}`,
							message: `High temperature: ${point.temperature_c.toFixed(1)}°C`,
							severity: 'warning' as const
						}
					: undefined
		}))
	);
	let secondarySeries = $derived<(CwLineChartSecondaryDataPoint & { timestamp: string })[]>(
		selectedTelemetry.map((point) => ({
			timestamp: point.created_at,
			created_at: point.created_at,
			value: point.humidity
		}))
	);
	let heatmapSeries = $derived<(CwHeatmapDataPoint & { timestamp: string })[]>(
		selectedTelemetry.map((point) => ({
			timestamp: point.created_at,
			created_at: point.created_at,
			value: point.temperature_c
		}))
	);
	// +1 day so data spanning a midnight boundary is always visible
	let heatmapDays = $derived(Math.ceil(selectedRangeHours / 24) + 1);

	function selectRange(hours: RangeHours) {
		selectedRangeHours = hours;
	}

	async function loadTelemetryData(query: CwTableQuery): Promise<CwTableResult<TelemetryRow>> {
		tableLoading = true;
		try {
			const search = query.search.trim().toLowerCase();
			let rows = [...selectedTelemetry].reverse();

			if (search) {
				rows = rows.filter((row) =>
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
				const { column, direction } = query.sort;
				const dir = direction === 'asc' ? 1 : -1;
				rows.sort((a, b) => {
					switch (column) {
						case 'created_at':
							return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
						case 'temperature_c':
							return (a.temperature_c - b.temperature_c) * dir;
						case 'humidity':
							return (a.humidity - b.humidity) * dir;
						case 'co2':
							return (a.co2 - b.co2) * dir;
						default:
							return 0;
					}
				});
			}

			const start = Math.max(0, (query.page - 1) * query.pageSize);
			return {
				rows: rows.slice(start, start + query.pageSize),
				total: rows.length
			};
		} finally {
			tableLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Device Dashboard - {locationName} - CropWatch</title>
</svelte:head>

<div class="device-dashboard">
	<div>
		<CwButton
			variant="primary"
			onclick={() => goto(`/locations/${encodeURIComponent(locationId)}`)}
		>
			← Back to Location
		</CwButton>
	</div>
	<CwCard title={`Device ${devEui?.toUpperCase()}`} subtitle={`Location ${locationName}`} elevated>
		{#snippet subtitleSlot()}
			<span
				>• Last updated:
				<CwDuration
					from={latestData?.created_at}
					alarmAfterMinutes={10.5}
					alarmCallback={() => invalidateAll()}
					class="subtitle-duration"
				/>
			</span>
		{/snippet}
		<div class="dashboard-toolbar">
			<div class="dashboard-toolbar__primary">
				<CwButton variant="secondary" onclick={() => { goto(`/locations/${encodeURIComponent(locationId)}/devices/${encodeURIComponent(devEui)}/settings`) }}>Settings</CwButton>
				<CwButton variant="info" onclick={() => downloadCsv(selectedTelemetry, locationName, devEui, selectedRangeHours)}>Download CSV</CwButton>
			</div>

			<div>
				<p>Graph Data Range:</p>
				<div class="dashboard-toolbar__ranges">
					{#each RANGE_OPTIONS as hours (hours)}
						<CwButton
							variant={selectedRangeHours === hours ? 'primary' : 'secondary'}
							onclick={() => selectRange(hours)}
						>
							{hours}h
						</CwButton>
					{/each}
				</div>
			</div>
		</div>
	</CwCard>

	<div class="kpi-grid">
		<CwCard title="Latest Temperature" subtitle="Current reading" elevated>
			<p class="kpi-value">{latestData?.temperature_c.toFixed(2)}<span>°C</span></p>
			<CwChip label="Nominal" tone="success" variant="soft" />
		</CwCard>

		<CwCard title="Latest Humidity" subtitle="Current reading" elevated>
			<p class="kpi-value">{latestData?.humidity.toFixed(2)}<span>%</span></p>
			<CwChip label="Stable" tone="info" variant="soft" />
		</CwCard>

		<CwCard title="Latest CO₂" subtitle="Current reading" elevated>
			<p class="kpi-value">{latestData?.co2}<span>ppm</span></p>
			<CwChip label="Ventilation OK" tone="warning" variant="soft" />
		</CwCard>

		<CwCard title="Alert Status" subtitle={`Occurred ${lastSeenLabel}`} elevated>
			<p class="kpi-value">OK<span></span></p>
			<CwChip label="Online" tone="success" variant="soft" />
		</CwCard>
	</div>

	<div class="chart-grid">
		<CwCard
			title={`Temperature and Humidity • last ${selectedRangeHours}h`}
			subtitle="Hourly readings"
			elevated
		>
			<CwLineChart
				data={lineSeries}
				secondaryData={secondarySeries}
				threshold={29}
				primaryLabel="Temperature"
				secondaryLabel="Humidity"
				primaryUnit="°C"
				secondaryUnit="%"
				height={320}
			/>
		</CwCard>

		<CwCard
			title={`Temperature Heatmap • last ${selectedRangeHours}h`}
			subtitle="Temperature by hour"
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

	<CwCard
		title={`Telemetry Table • last ${selectedRangeHours}h`}
		subtitle="Searchable, sortable data"
		elevated
	>
		{#key selectedRangeHours}
			<CwDataTable
				{columns}
				loadData={loadTelemetryData}
				loading={tableLoading}
				rowKey="id"
				searchable
				bind:pageSize
				pageSizeOptions={[12, 24, 48]}
			>
				{#snippet toolbarActions()}
					<div class="table-toolbar">
						<CwChip label={`${selectedTelemetry.length} Data Points`} tone="info" variant="soft" />
					</div>
				{/snippet}

				{#snippet cell(row: TelemetryRow, col: CwColumnDef<TelemetryRow>, defaultValue: string)}
					{#if col.key === 'created_at'}
						{new Date(row.created_at).toLocaleString()}
					{:else if col.key === 'temperature_c'}
						{row.temperature_c.toFixed(2)} °C
					{:else if col.key === 'humidity'}
						{row.humidity.toFixed(2)} %
					{:else if col.key === 'co2'}
						{row.co2} ppm
					{:else if col.key === 'alertRaised'}
						{#if row.alertRaised}
							<CwChip label="Alert" tone="danger" variant="outline" />
						{/if}
					{:else}
						{defaultValue}
					{/if}
				{/snippet}

				{#snippet rowActions(row: TelemetryRow)}
					<CwButton variant="info" onclick={() => alert(`Details for ${row.created_at}`)}>
						Add a Note
					</CwButton>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</div>
