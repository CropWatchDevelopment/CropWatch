<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { m } from '$lib/paraglide/messages.js';
	import {
		formatDay,
		formatHour,
		formatTrafficValue,
		metricLabel,
		readNumber,
		type HourlyTrafficRow
	} from './traffic-data';
	import { fetchWeatherByRange, type WeatherDaySummary } from './traffic-weather';

	type CsvRow = Record<string, string | number | null>;

	interface Props {
		hourlyRows: HourlyTrafficRow[];
		classKeys: string[];
		locationName: string;
		devEui: string;
		todayDayKey: string;
		todayBounds: { start: Date; end: Date };
		latitude: number | null;
		longitude: number | null;
		weatherByDay: Record<string, WeatherDaySummary>;
		loading: boolean;
	}

	let {
		hourlyRows,
		classKeys,
		locationName,
		devEui,
		todayDayKey,
		todayBounds,
		latitude,
		longitude,
		weatherByDay,
		loading
	}: Props = $props();

	let tableLoading = $state(false);
	let csvDownloading = $state(false);

	const columns = $derived<CwColumnDef<HourlyTrafficRow>[]>([
		{ key: 'traffic_hour', header: m.traffic_hour(), sortable: true, width: '12rem' },
		{ key: 'total_traffic', header: m.traffic_total_traffic(), sortable: true, width: '8rem' },
		...classKeys.map((key) => ({
			key,
			header: metricLabel(key),
			sortable: true,
			width: '8rem'
		}))
	]);

	// CwDataTable only re-calls loadData when its query changes; this fingerprint
	// rides in as an external filter so fresh telemetry re-renders the table.
	const dataFingerprint = $derived(
		`${hourlyRows.length}:${hourlyRows.reduce((sum, row) => sum + row.total_traffic, 0)}`
	);

	async function loadHourlyData(query: CwTableQuery): Promise<CwTableResult<HourlyTrafficRow>> {
		tableLoading = true;

		try {
			let filtered = [...hourlyRows].sort(
				(left, right) => right.hour_timestamp - left.hour_timestamp
			);

			if (query.search.trim()) {
				const search = query.search.trim().toLowerCase();
				filtered = filtered.filter((row) =>
					[
						formatHour(row.traffic_hour),
						row.total_traffic,
						row.samples,
						...classKeys.map((key) => row[key] ?? '')
					]
						.join(' ')
						.toLowerCase()
						.includes(search)
				);
			}

			if (query.sort) {
				const direction = query.sort.direction === 'asc' ? 1 : -1;
				filtered.sort((left, right) => {
					const leftValue = left[query.sort!.column];
					const rightValue = right[query.sort!.column];
					const leftNumber = readNumber(leftValue);
					const rightNumber = readNumber(rightValue);

					if (leftNumber !== null && rightNumber !== null) {
						return (leftNumber - rightNumber) * direction;
					}

					return String(leftValue ?? '').localeCompare(String(rightValue ?? '')) * direction;
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

	/* ── CSV export (keeps the daily weather columns) ─────────────────── */

	function buildCsvRows(weather: Record<string, WeatherDaySummary>): CsvRow[] {
		return hourlyRows.map((row) => {
			const dayWeather = weather[row.day_key];
			const csvRow: CsvRow = {
				traffic_hour: formatHour(row.traffic_hour),
				day: formatDay(new Date(row.hour_timestamp)),
				total_traffic: row.total_traffic,
				samples: row.samples,
				weather_label: dayWeather?.label ?? m.traffic_unavailable(),
				weather_summary: dayWeather?.summary ?? m.traffic_weather_unavailable(),
				weather_code: dayWeather?.weatherCode ?? null,
				weather_temp_high_c: dayWeather?.temperatureHighC ?? null,
				weather_temp_low_c: dayWeather?.temperatureLowC ?? null,
				weather_precip_mm: dayWeather?.precipitationMm ?? null,
				weather_wind_kmh: dayWeather?.windSpeedKmh ?? null
			};

			for (const key of classKeys) {
				csvRow[key] = readNumber(row[key]) ?? 0;
			}

			return csvRow;
		});
	}

	function downloadCsv(rows: CsvRow[], filename: string): void {
		if (rows.length === 0) return;

		const keyMap: Record<string, true> = {};
		for (const row of rows) {
			for (const key of Object.keys(row)) {
				keyMap[key] = true;
			}
		}

		const preferredOrder = [
			'traffic_hour',
			'day',
			'total_traffic',
			'samples',
			'weather_label',
			'weather_summary',
			'weather_code',
			'weather_temp_high_c',
			'weather_temp_low_c',
			'weather_precip_mm',
			'weather_wind_kmh'
		];
		const ordered = preferredOrder.filter((key) => {
			if (!keyMap[key]) return false;
			delete keyMap[key];
			return true;
		});
		const columnKeys = [
			...ordered,
			...Object.keys(keyMap).sort((left, right) => left.localeCompare(right))
		];
		const escape = (value: unknown): string => {
			const text = value == null ? '' : String(value);
			return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
		};

		const csv = [
			columnKeys.join(','),
			...rows.map((row) => columnKeys.map((column) => escape(row[column])).join(','))
		].join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		document.body.append(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}

	async function handleCsvDownload(): Promise<void> {
		if (hourlyRows.length === 0) return;

		let weather = weatherByDay;
		if (latitude !== null && longitude !== null) {
			csvDownloading = true;
			try {
				weather = await fetchWeatherByRange(
					todayBounds.start,
					todayBounds.end,
					latitude,
					longitude
				);
			} catch (error) {
				console.error('Failed to refresh CSV weather:', error);
			} finally {
				csvDownloading = false;
			}
		}

		const safeLocation = locationName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'location';
		const safeDevEui = devEui.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'device';
		downloadCsv(
			buildCsvRows(weather),
			`${safeLocation}-${safeDevEui}-${todayDayKey}-traffic-hourly.csv`
		);
	}
</script>

<CwCard title={m.traffic_hourly_traffic()} subtitle={m.traffic_hourly_traffic_subtitle()} elevated>
	<div class="traffic-hourly-table__actions">
		<CwButton
			variant="secondary"
			size="sm"
			disabled={hourlyRows.length === 0 || csvDownloading}
			onclick={handleCsvDownload}
		>
			{csvDownloading ? m.traffic_preparing_csv() : m.traffic_download_hourly_csv()}
		</CwButton>
	</div>

	{#if loading && hourlyRows.length === 0}
		<p class="traffic-hourly-table__empty">{m.traffic_fetching_traffic_data()}</p>
	{:else if hourlyRows.length === 0}
		<p class="traffic-hourly-table__empty">{m.traffic_no_data_today()}</p>
	{:else}
		<CwDataTable
			labels={cwDataTableLabels()}
			{columns}
			loadData={loadHourlyData}
			loading={tableLoading}
			filters={{ fingerprint: [dataFingerprint] }}
			rowKey="id"
			searchable
		>
			{#snippet cell(row: HourlyTrafficRow, col: CwColumnDef<HourlyTrafficRow>)}
				{#if col.key === 'traffic_hour'}
					{formatHour(row.traffic_hour)}
				{:else}
					{formatTrafficValue(row[col.key])}
				{/if}
			{/snippet}
		</CwDataTable>
	{/if}
</CwCard>

<style>
	.traffic-hourly-table__actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.75rem;
	}

	.traffic-hourly-table__empty {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: var(--cw-text-secondary);
	}

	@media (max-width: 640px) {
		.traffic-hourly-table__actions {
			justify-content: stretch;
		}

		.traffic-hourly-table__actions :global(button) {
			width: 100%;
		}
	}
</style>
