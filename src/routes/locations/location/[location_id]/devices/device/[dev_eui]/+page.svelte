<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import DeviceHeatmap from '$lib/components/DeviceHeatmap.svelte';
	import { fetchDeviceHistory } from '$lib/data/SourceOfTruth.svelte';
	import type { Device } from '$lib/Interfaces/device.interface';
	import type { DeviceDataHistory } from '$lib/Interfaces/deviceDataHistory.interface';
	import { getContext, onMount } from 'svelte';
	import type { AppState } from '$lib/Interfaces/appState.interface';
	import type { PageData } from './$types';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWTable from '$lib/components/CWTable.svelte';
	import { goto } from '$app/navigation';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import CWCopy from '$lib/components/CWCopy.svelte';
	import CWDateRangePicker, { type DateRangeValue } from '$lib/components/CWDateRangePicker.svelte';
	import CWLineChart from '$lib/components/CWLineChart.svelte';
	import DOWNLOAD_ICON from '$lib/images/icons/download.svg';
	import CWDialog from '$lib/components/CWDialog.svelte';

	const getAppState = getContext<AppState>('appState');
	let appState = $derived(getAppState());
	let { data }: { data: PageData } = $props();

	let device: Device | undefined = $derived(
		appState.devices.find((d: Device) => d.id === page.params.dev_eui) 
	);

	let history: DeviceDataHistory[] = $state([]);
	let historyLoading = $state(true);
	let historyError: string | null = $state(null);

	let lineDateRange: DateRangeValue = $state({
		start: new Date(Date.now() - 24 * 60 * 60 * 1000),
		end: new Date()
	});

	if (data.initialHistory?.length) {
		history = data.initialHistory.map((p) => ({
			timestamp: p.timestamp || new Date().toISOString(),
			temperature: p.primary ?? 0,
			humidity: p.secondary ?? 0,
			co2: p.co2 ?? null,
			alert: false
		}));
		historyLoading = false;
	}

	onMount(async () => {
		if (history.length) return;
		historyLoading = true;
		historyError = null;
		try {
			const { points } = await fetchDeviceHistory({
				devEui: page.params.dev_eui,
				limit: 2000,
				hoursBack: 24
			});

			if (points.length) {
				history = points.map((p) => ({
					timestamp: p.timestamp || new Date().toISOString(),
					temperature: p.primary ?? 0,
					humidity: p.secondary ?? 0,
					co2: p.co2 ?? null,
					alert: false
				}));
			} else if (device) {
				history = [
					{
						timestamp: device.lastSeen,
						temperature: device.temperatureC,
						humidity: device.humidity,
						co2: device.co2 ?? null,
						alert: device.hasAlert
					}
				];
			}
		} catch (err) {
			console.error(err);
			historyError = 'Unable to load historical data';
		} finally {
			historyLoading = false;
		}
	});

	const latestReading = $derived.by(() => {
		const latest = history[0];
		return {
			temperature: latest?.temperature ?? device?.temperatureC ?? 0,
			humidity: latest?.humidity ?? device?.humidity ?? 0,
			timestamp: latest?.timestamp ?? new Date().toISOString(),
			alert: latest?.alert ?? false
		};
	});

	const chronologicalHistory = $derived([...history].reverse());
	const sortedHistory = $derived(
		[...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
	);

	const temperatureValues = $derived(history.map((entry) => entry.temperature));
	const humidityValues = $derived(history.map((entry) => entry.humidity));
	const co2Values = $derived(history.map((entry) => entry.co2 ?? 0));
	let showDownloadModal: boolean = $state<boolean>(false);

	function summarize(values: number[]) {
		if (!values.length) return { high: 0, low: 0, avg: 0, stdDeviation: 0 };
		const high = Math.max(...values);
		const low = Math.min(...values);
		const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
		const variance =
			values.reduce((sum, value) => sum + Math.pow(value - avg, 2), 0) / values.length;
		const stdDeviation = Math.sqrt(variance);

		return { high, low, avg, stdDeviation };
	}

	function median(values: number[]) {
		if (!values.length) return 0;
		const sorted = [...values].sort((a, b) => a - b);
		const mid = Math.floor(sorted.length / 2);
		return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
	}

	const temperatureStats = $derived(summarize(temperatureValues));
	const humidityStats = $derived(summarize(humidityValues));
	const co2Stats = $derived(summarize(co2Values));
	const temperatureMedian = $derived(median(temperatureValues));
	const humidityMedian = $derived(median(humidityValues));
	const co2Median = $derived(median(co2Values));
	const readingCount = $derived(history.length);
	const temperatureDelta = $derived.by(() =>
		history[1] ? latestReading.temperature - history[1].temperature : 0
	);
	const humidityDelta = $derived.by(() =>
		history[1] ? latestReading.humidity - history[1].humidity : 0
	);

	const baseMetricCards = $derived.by(() => [
		{
			key: 'temperature',
			label: 'Temperature',
			unit: '°C',
			current: latestReading.temperature,
			delta: temperatureDelta,
			min: temperatureStats.low,
			max: temperatureStats.high,
			avg: temperatureStats.avg,
			median: temperatureMedian,
			stdDeviation: temperatureStats.stdDeviation,
			range: temperatureStats.high - temperatureStats.low,
			count: readingCount,
			palette: {
				accent: 'text-amber-400',
				bar: 'bg-amber-400/70',
				knob: 'bg-amber-400',
				badge: 'text-amber-300'
			}
		},
		{
			key: 'humidity',
			label: 'Humidity',
			unit: '%',
			current: latestReading.humidity,
			delta: humidityDelta,
			min: humidityStats.low,
			max: humidityStats.high,
			avg: humidityStats.avg,
			median: humidityMedian,
			stdDeviation: humidityStats.stdDeviation,
			range: humidityStats.high - humidityStats.low,
			count: readingCount,
			palette: {
				accent: 'text-sky-400',
				bar: 'bg-sky-400/70',
				knob: 'bg-sky-400',
				badge: 'text-sky-300'
			}
		},
		{
			key: 'co2',
			label: 'CO₂',
			unit: 'ppm',
			current: history[0]?.co2 ?? device?.co2 ?? 0,
			delta: history[1] ? (history[0]?.co2 ?? 0) - (history[1]?.co2 ?? 0) : 0,
			min: co2Stats.low,
			max: co2Stats.high,
			avg: co2Stats.avg,
			median: co2Median,
			stdDeviation: co2Stats.stdDeviation,
			range: co2Stats.high - co2Stats.low,
			count: readingCount,
			palette: {
				accent: 'text-emerald-300',
				bar: 'bg-emerald-400/70',
				knob: 'bg-emerald-400',
				badge: 'text-emerald-200'
			}
		}
	]);

	const metricCards = $derived.by(() =>
		baseMetricCards.map((card) => {
			const padding = Math.max(0.5, card.range * 0.15 || 0.5);
			const scaleMin = card.min - padding;
			const scaleMax = card.max + padding;

			return {
				...card,
				scaleMin,
				scaleMax,
				positions: {
					min: toPercent(card.min, scaleMin, scaleMax),
					avg: toPercent(card.avg, scaleMin, scaleMax),
					max: toPercent(card.max, scaleMin, scaleMax),
					current: toPercent(card.current, scaleMin, scaleMax)
				}
			};
		})
	);

	const alertCount = $derived(history.filter((entry) => entry.alert).length);

	function toPercent(value: number, min: number, max: number) {
		if (max - min === 0) return 50;
		return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
	}

	// Format history data for CWLineChart
	const temperatureChartData = $derived(
		chronologicalHistory.map((entry) => ({
			timestamp: entry.timestamp,
			value: entry.temperature,
			alert: entry.alert
				? { id: entry.timestamp, message: 'Temperature alert', severity: 'warning' as const }
				: undefined
		}))
	);

	const humidityChartData = $derived(
		chronologicalHistory.map((entry) => ({
			timestamp: entry.timestamp,
			value: entry.humidity
		}))
	);

	// Calculate a reasonable temperature threshold (e.g., average + 1 std deviation, or use a fixed value)
	const temperatureThreshold = $derived(temperatureStats.avg + temperatureStats.stdDeviation);

	const heatmapRange = $derived.by(() => {
		if (!history.length) return 'No history';
		const newest = history[0]?.timestamp;
		const oldest = history[history.length - 1]?.timestamp;
		if (!newest || !oldest) return 'History range';
		const fmt = new Intl.DateTimeFormat('en', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		});
		return `${fmt.format(new Date(oldest))} → ${fmt.format(new Date(newest))}`;
	});

	const heatmapPalette = {
		temperature: ['bg-sky-900', 'bg-sky-800', 'bg-sky-700', 'bg-sky-600', 'bg-rose-500'],
		humidity: ['bg-slate-800', 'bg-teal-700', 'bg-teal-500', 'bg-teal-400', 'bg-cyan-300'],
		co2: ['bg-slate-800', 'bg-lime-800', 'bg-lime-600', 'bg-amber-500', 'bg-red-500']
	};

	const formatter = new Intl.DateTimeFormat('en', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC'
	});

	const heatmapSeries = $derived.by(() => ({
		temperature: {
			key: 'temperature',
			label: 'Temp',
			unit: '°C',
			palette: heatmapPalette.temperature,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.temperature,
				alert: entry.alert
			}))
		},
		humidity: {
			key: 'humidity',
			label: 'Humidity',
			unit: '%',
			palette: heatmapPalette.humidity,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.humidity,
				alert: entry.alert
			}))
		},
		co2: {
			key: 'co2',
			label: 'CO₂',
			unit: 'ppm',
			palette: heatmapPalette.co2,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.co2 ?? 0,
				alert: entry.alert
			}))
		}
	}));

	function formatHour(timestamp: string) {
		return formatter.format(new Date(timestamp));
	}

	const historyTableColumns = [
		{
			key: 'timestamp',
			label: 'Timestamp (UTC)',
			type: 'datetime' as const,
			sortable: true
		},
		{
			key: 'temperature',
			label: 'Temperature',
			type: 'number' as const,
			suffix: '°C',
			sortable: true
		},
		{
			key: 'co2',
			label: 'CO₂',
			type: 'text' as const,
			sortable: true
		},
		{
			key: 'humidity',
			label: 'Humidity',
			type: 'number' as const,
			suffix: '%',
			sortable: true
		},
		{
			key: 'alert',
			label: 'Status',
			type: 'badge' as const,
			sortable: true,
			badges: {
				true: {
					label: 'Alert',
					dotClass: 'bg-amber-400',
					badgeClass: 'bg-amber-400/20 text-amber-100'
				},
				false: {
					label: 'Normal',
					dotClass: 'bg-emerald-400',
					badgeClass: 'bg-emerald-500/10 text-emerald-200'
				}
			}
		}
	];

	const historyTableItems = $derived(
		sortedHistory.map((entry) => ({
			...entry,
			co2: entry.co2 != null ? entry.co2 : '—',
			alert: String(entry.alert)
		}))
	);
</script>

<svelte:head>
	<title>Device Details - CropWatch Temp</title>
</svelte:head>

<div class="flex flex-col gap-8 p-6 text-slate-100">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-row w-full items-center gap-3">
			<CWBackButton fallback="/locations" />

			<span class="flex flex-grow"></span>

			<CWButton variant="secondary" onclick={() => (showDownloadModal = !showDownloadModal)}>
				<img src={DOWNLOAD_ICON} alt="Download data" class="h-4 w-4" />
				Download Data
			</CWButton>

			<CWButton
				variant="secondary"
				onclick={() => {
					goto(`${page.url.pathname}/settings?prev=${page.url.pathname}`);
				}}
			>
				<img src={SETTINGS_ICON} alt="Go back" class="h-4 w-4" />
				Settings
			</CWButton>
		</div>
	</div>

	{#if !device}
		<div class="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 p-12 shadow-lg shadow-slate-950/40">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
				</svg>
			</div>
			<p class="text-lg font-medium text-slate-200">No device data yet...</p>
			<p class="mt-2 text-sm text-slate-400">Please wait for the device to send.</p>
		</div>
	{:else}

	<header
		class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40"
	>
		<div class="flex flex-wrap items-center justify-between gap-4">
			<div>
				<h1 class="mt-1 text-3xl font-semibold text-white">{device?.name}</h1>
				<p class="text-sm text-slate-400">
					Device EUI •
					<CWCopy value={page.params.dev_eui} size="sm" />
				</p>
			</div>
			<div class="text-right text-sm text-slate-400">
				<p>Location: Freezer Aisle 01</p>
				<p>Facility: Miyazaki Processing Plant</p>
				<p>Updated: {formatHour(latestReading.timestamp)} UTC</p>
			</div>
		</div>
	</header>

	<section class="grid gap-4 lg:grid-cols-2">
		{#each metricCards as card (card.key)}
			<div
				class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/50"
			>
				<div class="flex flex-wrap items-start justify-between gap-4">
					<div>
						<p class="text-xs uppercase tracking-[0.3em] text-slate-400">{card.label}</p>
						<div class="mt-2 flex items-baseline gap-3">
							<p class="text-4xl font-semibold text-white">
								{card.current.toFixed(1)}{card.unit}
							</p>
							<span
								class={`text-sm font-semibold ${card.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
							>
								{card.delta >= 0 ? '▲' : '▼'}
								{Math.abs(card.delta).toFixed(1)}{card.unit}
								{card.delta >= 0 ? 'Above Average' : 'Below Average'}
							</span>
						</div>
					</div>
					<div class="text-right text-xs leading-relaxed text-slate-400">
						<p>Count: {card.count}</p>
						<p>Range: {card.range.toFixed(2)}{card.unit}</p>
						<p>Std dev: {card.stdDeviation.toFixed(2)}{card.unit}</p>
					</div>
				</div>

				<div class="mt-4 grid grid-cols-3 gap-3 text-center border-t border-slate-600 pt-4">
					<div>
						<p class="text-xs uppercase tracking-wide text-slate-400">Min</p>
						<p class="text-lg font-semibold text-slate-100">
							{card.min.toFixed(2)}{card.unit}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-slate-400">Avg</p>
						<p class={`text-lg font-semibold ${card.palette.accent}`}>
							{card.avg.toFixed(2)}{card.unit}
						</p>
					</div>
					<div>
						<p class="text-xs uppercase tracking-wide text-slate-400">Max</p>
						<p class="text-lg font-semibold text-slate-100">
							{card.max.toFixed(2)}{card.unit}
						</p>
					</div>
				</div>

				<div class="mt-4">
					<div class="relative h-2 rounded-full bg-slate-900">
						<div
							class={`absolute h-full rounded-full ${card.palette.bar}`}
							style={`left:${card.positions.min}%; right:${100 - card.positions.max}%;`}
						></div>
						<span
							class="absolute -top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-950 bg-white/70"
							style={`left:${card.positions.min}%;`}
						></span>
						<span
							class={`absolute -top-2 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white/40 ${card.palette.knob} shadow-lg shadow-black/40`}
							style={`left:${card.positions.avg}%;`}
						></span>
						<span
							class="absolute -top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-950 bg-white/70"
							style={`left:${card.positions.max}%;`}
						></span>
						<span
							class="absolute top-3 -translate-x-1/2 text-[10px] font-semibold text-white"
							style={`left:${card.positions.current}%;`}
						>
							Now
						</span>
					</div>
				</div>

				<div class="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
					<p>
						<span class="text-slate-400">Median:</span>
						<span class={`ml-2 font-semibold ${card.palette.badge}`}>
							{card.median.toFixed(2)}{card.unit}
						</span>
					</p>
					<p>
						<span class="text-slate-400">Range:</span>
						<span class="ml-2 font-semibold text-slate-100">{card.range.toFixed(2)}{card.unit}</span
						>
					</p>
					<p>
						<span class="text-slate-400">Alerts:</span>
						<span
							class={`ml-2 font-semibold ${alertCount ? 'text-amber-300' : 'text-emerald-300'}`}
						>
							{alertCount}
						</span>
					</p>
					<p>
						<span class="text-slate-400">Central value:</span>
						<span class="ml-2 font-semibold text-slate-100"
							>{card.median.toFixed(2)}{card.unit}</span
						>
					</p>
				</div>
			</div>
		{/each}
	</section>

	{#if historyLoading}
		<p class="mt-4 text-sm text-slate-400">Loading historical data…</p>
	{:else if historyError}
		<p class="mt-4 text-sm text-amber-300">{historyError}</p>
	{/if}

	<svelte:boundary>
		<DeviceHeatmap
			title="Thermal footprint"
			subtitle="Past 24 hours"
			metrics={heatmapSeries}
			dateRange={heatmapRange}
		/>
		{#snippet failed(error, reset)}
			<div
				class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40"
			>
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-8 w-8 text-rose-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
							/>
						</svg>
					</div>
					<p class="text-rose-300 font-medium">Failed to load heatmap</p>
					<p class="mt-1 text-sm text-slate-400">
						{(error as Error)?.message || 'An unexpected error occurred'}
					</p>
					<button
						onclick={reset}
						class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
					>
						Try again
					</button>
				</div>
			</div>
		{/snippet}
	</svelte:boundary>

	<section
		class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40"
	>
		<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
			<div>
				<p class="text-xs uppercase tracking-[0.2em] text-slate-400">Line chart</p>
				<h2 class="text-xl font-semibold text-white">Temperature & Humidity</h2>
			</div>
			<label
				class="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200"
			>
				<span class="text-xs uppercase tracking-wide text-slate-400">Range</span>
				<CWDateRangePicker maxDate={new Date()} bind:value={lineDateRange} />
			</label>
		</div>
		{#if historyLoading}
			<div class="flex items-center justify-center h-[350px] text-slate-400">
				<p>Loading chart data…</p>
			</div>
		{:else if temperatureChartData.length === 0}
			<div class="flex items-center justify-center h-[350px] text-slate-400">
				<p>No data available for chart</p>
			</div>
		{:else}
			<CWLineChart
				data={temperatureChartData}
				secondaryData={humidityChartData}
				primaryLabel="Temperature"
				secondaryLabel="Humidity"
				primaryUnit="°C"
				secondaryUnit="%"
				height={350}
			/>
		{/if}
	</section>

	<section
		class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40"
	>
		<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
			<div>
				<p class="text-xs uppercase tracking-[0.2em] text-slate-400">24h history</p>
				<h2 class="text-xl font-semibold text-white">All telemetry points</h2>
			</div>
		</div>

		<div class="overflow-hidden rounded-2xl border border-slate-800">
			<svelte:boundary>
				<CWTable
					items={historyTableItems}
					columns={historyTableColumns}
					pageSize={15}
					sortKey="timestamp"
					sortDir="desc"
					getRowId={(item) => (item as { timestamp: string }).timestamp}
				/>
				{#snippet failed(error, reset)}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div
							class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8 text-rose-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
						<p class="text-rose-300 font-medium">Failed to load telemetry data</p>
						<p class="mt-1 text-sm text-slate-400">
							{(error as Error)?.message || 'An unexpected error occurred'}
						</p>
						<button
							onclick={reset}
							class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors"
						>
							Try again
						</button>
					</div>
				{/snippet}
			</svelte:boundary>
		</div>
	</section>
	{/if}
</div>

<CWDialog bind:open={showDownloadModal} title="Download Device Data">
	<label
		class="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200"
	>
		<span class="text-xs uppercase tracking-wide text-slate-400">Range</span>
		<CWDateRangePicker maxDate={new Date()} bind:value={lineDateRange} />
	</label>
	<div class="mt-4 text-sm text-slate-300">
		<input type="radio" name="format" value="csv" checked class="mr-2" /> CSV Format<br />
		<input type="radio" name="format" value="json" class="mr-2" /> PDF Format
	</div>
	<div class="mt-6 flex justify-end gap-4">
		<CWButton variant="secondary" onclick={() => (showDownloadModal = false)}>Cancel</CWButton>
		<CWButton
			onclick={() => {
				// Trigger download (implementation not shown)
				showDownloadModal = false;
			}}
		>
			Download
		</CWButton>
	</div>
</CWDialog>
