<script lang="ts">
	import { page } from '$app/state';
	import DeviceHeatmap from '$lib/components/DeviceHeatmap.svelte';
	import { fetchDeviceHistory } from '$lib/data/SourceOfTruth.svelte';
	import type { Device } from '$lib/Interfaces/device.interface';
	import { getContext, onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
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
	import TrafficDashboard from '$lib/components/traffic/TrafficDashboard.svelte';
	import type { TrafficRow } from '$lib/components/traffic/traffic.types';

	const getAppState = getContext<AppState>('appState');
	let appState = $derived(getAppState());
	let { data }: { data: PageData } = $props();

	type HistoryMeta = {
		table?: string | null;
		primaryKey?: string | null;
		secondaryKey?: string | null;
	};

	type SensorMode = 'air' | 'soil';

	type HistoryPoint = {
		timestamp?: string | null;
		primary?: number | null;
		secondary?: number | null;
		co2?: number | null;
		ec?: number | null;
		raw?: Record<string, unknown>;
	};

	type TelemetryEntry = {
		timestamp: string;
		temperature: number;
		humidity?: number;
		moisture?: number;
		co2?: number | null;
		ec?: number | null;
		alert: boolean;
	};

	const getSensorMode = (table?: string | null): SensorMode =>
		table === 'cw_soil_data' ? 'soil' : 'air';

	const toNumber = (value: unknown, fallback = 0) => {
		const numeric = typeof value === 'number' ? value : Number(value);
		return Number.isFinite(numeric) ? numeric : fallback;
	};

	const toOptionalNumber = (value: unknown) => {
		const numeric = typeof value === 'number' ? value : Number(value);
		return Number.isFinite(numeric) ? numeric : null;
	};

	const mapHistoryEntry = (point: HistoryPoint, mode: SensorMode): TelemetryEntry => {
		const timestamp = point.timestamp || new Date().toISOString();
		if (mode === 'soil') {
			const ecValue = point.ec ?? point.raw?.['ec'];
			return {
				timestamp,
				temperature: toNumber(point.primary),
				moisture: toNumber(point.secondary),
				ec: toNumber(ecValue),
				alert: false
			};
		}
		return {
			timestamp,
			temperature: toNumber(point.primary),
			humidity: toNumber(point.secondary),
			co2: toOptionalNumber(point.co2),
			alert: false
		};
	};

	const mapHistory = (points: HistoryPoint[], mode: SensorMode) =>
		points.map((point) => mapHistoryEntry(point, mode));

	let device: Device | undefined = $derived(
		appState.devices.find((d: Device) => d.id === page.params.dev_eui)
	);

	let history: TelemetryEntry[] = $state([]);
	let historyMeta = $state<HistoryMeta | null>(data.historyMeta ?? null);
	const sensorMode = $derived.by(() => getSensorMode(historyMeta?.table));
	const isSoilDevice = $derived.by(() => sensorMode === 'soil');
	let historyLoading = $state(true);
	let historyError: string | null = $state(null);

	let lineDateRange: DateRangeValue = $state({
		start: new Date(Date.now() - 24 * 60 * 60 * 1000),
		end: new Date()
	});
	const TRAFFIC_TIME_ZONE = 'Asia/Tokyo';
	const trafficDateFormatterTZ = new Intl.DateTimeFormat('en-CA', {
		timeZone: TRAFFIC_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	});
	const trafficDateTimeFormatterTZ = new Intl.DateTimeFormat('en-CA', {
		timeZone: TRAFFIC_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	});

	if (data.initialHistory?.length) {
		const initialMode = getSensorMode(data.historyMeta?.table);
		history = mapHistory(data.initialHistory, initialMode);
		historyLoading = false;
	}

	onMount(async () => {
		if (history.length) return;
		historyLoading = true;
		historyError = null;
		try {
			const { points, meta } = await fetchDeviceHistory({
				devEui: page.params.dev_eui,
				limit: 2000,
				hoursBack: 24
			});
			historyMeta = meta ?? null;
			const mode = getSensorMode(meta?.table);

			if (points.length) {
				history = mapHistory(points, mode);
			} else if (device && mode === 'air') {
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

	const airLatestReading = $derived.by(() => {
		const latest = history[0];
		return {
			temperature: latest?.temperature ?? device?.temperatureC ?? 0,
			humidity: latest?.humidity ?? device?.humidity ?? 0,
			co2: latest?.co2 ?? device?.co2 ?? null,
			timestamp: latest?.timestamp ?? new Date().toISOString(),
			alert: latest?.alert ?? false
		};
	});

	const soilLatestReading = $derived.by(() => {
		const latest = history[0];
		return {
			temperature: latest?.temperature ?? 0,
			moisture: latest?.moisture ?? 0,
			ec: latest?.ec ?? 0,
			timestamp: latest?.timestamp ?? new Date().toISOString(),
			alert: latest?.alert ?? false
		};
	});

	const latestTimestamp = $derived.by(() =>
		isSoilDevice ? soilLatestReading.timestamp : airLatestReading.timestamp
	);

	const chronologicalHistory = $derived([...history].reverse());
	const sortedHistory = $derived(
		[...history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
	);

	const temperatureValues = $derived(history.map((entry) => entry.temperature));
	const humidityValues = $derived(history.map((entry) => entry.humidity ?? 0));
	const co2Values = $derived(history.map((entry) => entry.co2 ?? 0));
	const moistureValues = $derived(history.map((entry) => entry.moisture ?? 0));
	const ecValues = $derived(history.map((entry) => entry.ec ?? 0));
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

	type MetricPalette = {
		accent: string;
		bar: string;
		knob: string;
		badge: string;
	};

	type MetricCard = {
		key: string;
		label: string;
		unit: string;
		current: number;
		delta: number;
		min: number;
		max: number;
		avg: number;
		median: number;
		stdDeviation: number;
		range: number;
		count: number;
		palette: MetricPalette;
	};

	type MetricCardScaled = MetricCard & {
		scaleMin: number;
		scaleMax: number;
		positions: {
			min: number;
			avg: number;
			max: number;
			current: number;
		};
	};

	const temperatureStats = $derived(summarize(temperatureValues));
	const humidityStats = $derived(summarize(humidityValues));
	const co2Stats = $derived(summarize(co2Values));
	const moistureStats = $derived(summarize(moistureValues));
	const ecStats = $derived(summarize(ecValues));
	const temperatureMedian = $derived(median(temperatureValues));
	const humidityMedian = $derived(median(humidityValues));
	const co2Median = $derived(median(co2Values));
	const moistureMedian = $derived(median(moistureValues));
	const ecMedian = $derived(median(ecValues));
	const readingCount = $derived(history.length);
	const airTemperatureDelta = $derived.by(() =>
		history[1] ? airLatestReading.temperature - history[1].temperature : 0
	);
	const airHumidityDelta = $derived.by(() =>
		history[1] ? airLatestReading.humidity - (history[1].humidity ?? 0) : 0
	);
	const soilTemperatureDelta = $derived.by(() =>
		history[1] ? soilLatestReading.temperature - history[1].temperature : 0
	);
	const soilMoistureDelta = $derived.by(() =>
		history[1] ? soilLatestReading.moisture - (history[1].moisture ?? 0) : 0
	);
	const soilEcDelta = $derived.by(() =>
		history[1] ? soilLatestReading.ec - (history[1].ec ?? 0) : 0
	);

	const buildMetricCards = (cards: MetricCard[]): MetricCardScaled[] =>
		cards.map((card) => {
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
		});

	const airBaseMetricCards = $derived.by(() => [
		{
			key: 'temperature',
			label: 'Temperature',
			unit: '°C',
			current: airLatestReading.temperature,
			delta: airTemperatureDelta,
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
			current: airLatestReading.humidity,
			delta: airHumidityDelta,
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
			current: airLatestReading.co2 ?? 0,
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

	const soilBaseMetricCards = $derived.by(() => [
		{
			key: 'soil-temperature',
			label: 'Soil Temperature',
			unit: '°C',
			current: soilLatestReading.temperature,
			delta: soilTemperatureDelta,
			min: temperatureStats.low,
			max: temperatureStats.high,
			avg: temperatureStats.avg,
			median: temperatureMedian,
			stdDeviation: temperatureStats.stdDeviation,
			range: temperatureStats.high - temperatureStats.low,
			count: readingCount,
			palette: {
				accent: 'text-amber-300',
				bar: 'bg-amber-400/70',
				knob: 'bg-amber-400',
				badge: 'text-amber-200'
			}
		},
		{
			key: 'soil-moisture',
			label: 'Soil Moisture',
			unit: '%',
			current: soilLatestReading.moisture,
			delta: soilMoistureDelta,
			min: moistureStats.low,
			max: moistureStats.high,
			avg: moistureStats.avg,
			median: moistureMedian,
			stdDeviation: moistureStats.stdDeviation,
			range: moistureStats.high - moistureStats.low,
			count: readingCount,
			palette: {
				accent: 'text-teal-300',
				bar: 'bg-teal-400/70',
				knob: 'bg-teal-400',
				badge: 'text-teal-200'
			}
		},
		{
			key: 'soil-ec',
			label: 'Soil EC',
			unit: 'mS/cm',
			current: soilLatestReading.ec,
			delta: soilEcDelta,
			min: ecStats.low,
			max: ecStats.high,
			avg: ecStats.avg,
			median: ecMedian,
			stdDeviation: ecStats.stdDeviation,
			range: ecStats.high - ecStats.low,
			count: readingCount,
			palette: {
				accent: 'text-lime-300',
				bar: 'bg-lime-400/70',
				knob: 'bg-lime-400',
				badge: 'text-lime-200'
			}
		}
	]);

	const airMetricCards = $derived.by(() => buildMetricCards(airBaseMetricCards));
	const soilMetricCards = $derived.by(() => buildMetricCards(soilBaseMetricCards));
	const metricCards = $derived.by(() => (isSoilDevice ? soilMetricCards : airMetricCards));

	const alertCount = $derived(history.filter((entry) => entry.alert).length);

	function toPercent(value: number, min: number, max: number) {
		if (max - min === 0) return 50;
		return Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
	}

	// Format history data for CWLineChart
	const airTemperatureChartData = $derived(
		chronologicalHistory.map((entry) => ({
			timestamp: entry.timestamp,
			value: entry.temperature,
			alert: entry.alert
				? { id: entry.timestamp, message: 'Temperature alert', severity: 'warning' as const }
				: undefined
		}))
	);

	const airHumidityChartData = $derived(
		chronologicalHistory.map((entry) => ({
			timestamp: entry.timestamp,
			value: entry.humidity ?? 0
		}))
	);

	const soilTemperatureChartData = $derived(
		chronologicalHistory.map((entry) => ({
			timestamp: entry.timestamp,
			value: entry.temperature
		}))
	);

	const soilMoistureChartData = $derived(
		chronologicalHistory.map((entry) => ({
			timestamp: entry.timestamp,
			value: entry.moisture ?? 0
		}))
	);

	const soilEcChartData = $derived(
		chronologicalHistory.map((entry) => ({
			timestamp: entry.timestamp,
			value: entry.ec ?? 0
		}))
	);

	// Thresholds use avg + 1 std deviation for contextual coloring
	const airTemperatureThreshold = $derived(temperatureStats.avg + temperatureStats.stdDeviation);
	const soilTemperatureThreshold = $derived(temperatureStats.avg + temperatureStats.stdDeviation);
	const soilMoistureThreshold = $derived(moistureStats.avg + moistureStats.stdDeviation);
	const soilEcThreshold = $derived(ecStats.avg + ecStats.stdDeviation);

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
		const oldestDate = new Date(oldest);
		const newestDate = new Date(newest);
		if (Number.isNaN(oldestDate.getTime()) || Number.isNaN(newestDate.getTime())) {
			return 'History range';
		}
		return `${fmt.format(oldestDate)} → ${fmt.format(newestDate)}`;
	});

	const airHeatmapPalette = {
		temperature: ['bg-sky-900', 'bg-sky-800', 'bg-sky-700', 'bg-sky-600', 'bg-rose-500'],
		humidity: ['bg-slate-800', 'bg-teal-700', 'bg-teal-500', 'bg-teal-400', 'bg-cyan-300'],
		co2: ['bg-slate-800', 'bg-lime-800', 'bg-lime-600', 'bg-amber-500', 'bg-red-500']
	};

	const soilHeatmapPalette = {
		temperature: ['bg-slate-900', 'bg-amber-900', 'bg-amber-700', 'bg-amber-500', 'bg-rose-500'],
		moisture: ['bg-slate-900', 'bg-emerald-900', 'bg-emerald-700', 'bg-emerald-500', 'bg-emerald-300'],
		ec: ['bg-slate-900', 'bg-lime-900', 'bg-lime-700', 'bg-lime-500', 'bg-lime-300']
	};

	const formatter = new Intl.DateTimeFormat('en', {
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC'
	});

	const airHeatmapSeries = $derived.by(() => ({
		temperature: {
			key: 'temperature',
			label: 'Temp',
			unit: '°C',
			palette: airHeatmapPalette.temperature,
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
			palette: airHeatmapPalette.humidity,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.humidity ?? 0,
				alert: entry.alert
			}))
		},
		co2: {
			key: 'co2',
			label: 'CO₂',
			unit: 'ppm',
			palette: airHeatmapPalette.co2,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.co2 ?? 0,
				alert: entry.alert
			}))
		}
	}));

	const soilHeatmapSeries = $derived.by(() => ({
		temperature: {
			key: 'temperature',
			label: 'Soil Temp',
			unit: '°C',
			palette: soilHeatmapPalette.temperature,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.temperature,
				alert: entry.alert
			}))
		},
		moisture: {
			key: 'moisture',
			label: 'Moisture',
			unit: '%',
			palette: soilHeatmapPalette.moisture,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.moisture ?? 0,
				alert: entry.alert
			}))
		},
		ec: {
			key: 'ec',
			label: 'EC',
			unit: 'mS/cm',
			palette: soilHeatmapPalette.ec,
			points: chronologicalHistory.map((entry) => ({
				label: formatHour(entry.timestamp),
				value: entry.ec ?? 0,
				alert: entry.alert
			}))
		}
	}));

	const activeHeatmapSeries = $derived.by(() =>
		isSoilDevice ? soilHeatmapSeries : airHeatmapSeries
	);

	function formatHour(timestamp: string) {
		const date = new Date(timestamp);
		if (Number.isNaN(date.getTime())) return '—';
		return formatter.format(date);
	}

	const airHistoryTableColumns = [
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

	const soilHistoryTableColumns = [
		{
			key: 'timestamp',
			label: 'Timestamp (UTC)',
			type: 'datetime' as const,
			sortable: true
		},
		{
			key: 'temperature',
			label: 'Soil Temperature',
			type: 'number' as const,
			suffix: '°C',
			sortable: true
		},
		{
			key: 'moisture',
			label: 'Soil Moisture',
			type: 'number' as const,
			suffix: '%',
			sortable: true
		},
		{
			key: 'ec',
			label: 'Soil EC',
			type: 'number' as const,
			suffix: 'mS/cm',
			sortable: true
		}
	];

	const historyTableColumns = $derived.by(() =>
		isSoilDevice ? soilHistoryTableColumns : airHistoryTableColumns
	);

	const airHistoryTableItems = $derived(
		sortedHistory.map((entry) => ({
			...entry,
			co2: entry.co2 != null ? entry.co2 : '—',
			alert: String(entry.alert)
		}))
	);

	const soilHistoryTableItems = $derived(
		sortedHistory.map((entry) => ({
			timestamp: entry.timestamp,
			temperature: entry.temperature,
			moisture: entry.moisture ?? 0,
			ec: entry.ec ?? 0
		}))
	);

	const historyTableItems = $derived.by(() =>
		isSoilDevice ? soilHistoryTableItems : airHistoryTableItems
	);

	const trafficRows = $derived(data.trafficRows ?? []);
	const trafficDailyTotals = $derived(data.trafficDailyTotals ?? []);
	const trafficDeviceType = $derived.by(() => {
		const raw = data.deviceType;
		return Array.isArray(raw) ? raw[0] ?? null : raw ?? null;
	});
	const trafficDeviceLabel = $derived.by(() => {
		const name = trafficDeviceType?.name ?? '';
		const manufacturer = trafficDeviceType?.manufacturer ?? '';
		const model = trafficDeviceType?.model ?? '';
		return `${manufacturer} ${name} ${model}`.trim();
	});
	const isTrafficDevice = $derived.by(() => {
		const label = trafficDeviceLabel.toLowerCase();
		return label.includes('cropwatch') && label.includes('nvidia') && label.includes('jetson');
	});

	const trafficRange = $derived.by(() => {
		const startParam = page.url.searchParams.get('trafficStart');
		const endParam = page.url.searchParams.get('trafficEnd');
		const start = startParam ? new Date(startParam) : null;
		const end = endParam ? new Date(endParam) : null;
		if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
			return { start, end };
		}
		return getTokyoMonthBounds(new Date());
	});

	function getMonthPartsTZ(date: Date) {
		const parts = trafficDateFormatterTZ.formatToParts(date);
		const year = Number(parts.find((p) => p.type === 'year')?.value ?? '1970');
		const monthIndex = Number(parts.find((p) => p.type === 'month')?.value ?? '01') - 1;
		return { year, monthIndex };
	}

	function zonedDateToUtc(
		year: number,
		monthIndex: number,
		day: number,
		hour: number,
		minute: number,
		second: number
	) {
		const utcGuess = Date.UTC(year, monthIndex, day, hour, minute, second);
		const parts = trafficDateTimeFormatterTZ.formatToParts(new Date(utcGuess));
		const adjusted = Date.UTC(
			Number(parts.find((p) => p.type === 'year')?.value ?? year),
			Number(parts.find((p) => p.type === 'month')?.value ?? monthIndex + 1) - 1,
			Number(parts.find((p) => p.type === 'day')?.value ?? day),
			Number(parts.find((p) => p.type === 'hour')?.value ?? hour),
			Number(parts.find((p) => p.type === 'minute')?.value ?? minute),
			Number(parts.find((p) => p.type === 'second')?.value ?? second)
		);
		const offset = adjusted - utcGuess;
		return new Date(utcGuess - offset);
	}

	function getTokyoMonthBounds(date: Date) {
		const { year, monthIndex } = getMonthPartsTZ(date);
		const start = zonedDateToUtc(year, monthIndex, 1, 0, 0, 0);
		const endDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
		const end = zonedDateToUtc(year, monthIndex, endDay, 23, 59, 59);
		return { start, end };
	}

	function formatDateTZ(date: Date) {
		const parts = trafficDateFormatterTZ.formatToParts(date);
		const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
		const month = parts.find((p) => p.type === 'month')?.value ?? '01';
		const day = parts.find((p) => p.type === 'day')?.value ?? '01';
		return `${year}-${month}-${day}`;
	}

	function formatDateTimeTZ(date: Date) {
		const parts = trafficDateTimeFormatterTZ.formatToParts(date);
		const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
		const month = parts.find((p) => p.type === 'month')?.value ?? '01';
		const day = parts.find((p) => p.type === 'day')?.value ?? '01';
		const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
		const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
		const second = parts.find((p) => p.type === 'second')?.value ?? '00';
		return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
	}

	function getLocalHourStartUtc(date: Date) {
		const parts = trafficDateTimeFormatterTZ.formatToParts(date);
		const year = Number(parts.find((p) => p.type === 'year')?.value ?? '1970');
		const monthIndex = Number(parts.find((p) => p.type === 'month')?.value ?? '01') - 1;
		const day = Number(parts.find((p) => p.type === 'day')?.value ?? '01');
		const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '00');
		return zonedDateToUtc(year, monthIndex, day, hour, 0, 0);
	}

	function csvEscape(value: string) {
		if (value.includes('"') || value.includes(',') || value.includes('\n')) {
			return `"${value.replace(/\"/g, '""')}"`;
		}
		return value;
	}

	function buildTrafficCsv(rows: TrafficRow[], rangeStart: Date, rangeEnd: Date) {
		const startTime = rangeStart.getTime();
		const endTime = rangeEnd.getTime();
		const buckets = new SvelteMap<
			string,
			{
				start: Date;
				people: number;
				bicycles: number;
				cars: number;
				trucks: number;
				buses: number;
			}
		>();
		for (let cursor = startTime; cursor <= endTime; cursor += 60 * 60 * 1000) {
			const start = new Date(cursor);
			buckets.set(start.toISOString(), {
				start,
				people: 0,
				bicycles: 0,
				cars: 0,
				trucks: 0,
				buses: 0
			});
		}
		const headers = [
			'traffic_hour_local',
			'traffic_hour_utc',
			'created_at_local',
			'created_at_utc',
			'line_number',
			'people_count',
			'bicycle_count',
			'car_count',
			'truck_count',
			'bus_count'
		];
		const lines = [headers.join(',')];

		for (const row of rows) {
			const trafficTimestamp = row.traffic_hour ?? row.created_at;
			const trafficDate = new Date(trafficTimestamp);
			if (!Number.isFinite(trafficDate.getTime())) continue;
			const bucketStart = getLocalHourStartUtc(trafficDate);
			if (bucketStart.getTime() < startTime || bucketStart.getTime() > endTime) continue;
			const bucket = buckets.get(bucketStart.toISOString());
			if (!bucket) continue;
			bucket.people += row.people_count ?? 0;
			bucket.bicycles += row.bicycle_count ?? 0;
			bucket.cars += row.car_count ?? 0;
			bucket.trucks += row.truck_count ?? 0;
			bucket.buses += row.bus_count ?? 0;
		}

		for (const bucket of buckets.values()) {
			const values = [
				formatDateTimeTZ(bucket.start),
				bucket.start.toISOString(),
				formatDateTimeTZ(bucket.start),
				bucket.start.toISOString(),
				'ALL',
				String(bucket.people),
				String(bucket.bicycles),
				String(bucket.cars),
				String(bucket.trucks),
				String(bucket.buses)
			];
			lines.push(values.map(csvEscape).join(','));
		}

		return lines.join('\n');
	}

	function downloadCsv(contents: string, filename: string) {
		const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		link.href = URL.createObjectURL(blob);
		link.download = filename;
		link.click();
		URL.revokeObjectURL(link.href);
	}
</script>

<svelte:head>
	<title>Device Details - CropWatch Temp</title>
</svelte:head>

<div class="flex flex-col gap-8 p-6 text-slate-100 overflow-x-clip">
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
				<p>Updated: {formatHour(latestTimestamp)} UTC</p>
			</div>
		</div>
	</header>

	{#if isTrafficDevice}
		<TrafficDashboard
			rows={trafficRows}
			dailyTotals={trafficDailyTotals}
			deviceName={device?.name ?? 'Traffic camera'}
			subtitle="Monthly calendar (daily totals) · Click a day for hourly breakdown"
		/>
	{/if}

	{#if !isTrafficDevice}
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
	{/if}

	{#if !isTrafficDevice}
	{#if historyLoading}
		<p class="mt-4 text-sm text-slate-400">Loading historical data…</p>
	{:else if historyError}
		<p class="mt-4 text-sm text-amber-300">{historyError}</p>
	{/if}
	{/if}

	{#if !isTrafficDevice}
	<svelte:boundary>
		<DeviceHeatmap
			title={isSoilDevice ? 'Soil footprint' : 'Thermal footprint'}
			subtitle="Past 24 hours"
			metrics={activeHeatmapSeries}
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
	{/if}

	{#if !isTrafficDevice}
	<section
		class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40"
	>
		<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
			<div>
				<p class="text-xs uppercase tracking-[0.2em] text-slate-400">Line chart</p>
				<h2 class="text-xl font-semibold text-white">
					{isSoilDevice ? 'Soil telemetry' : 'Temperature & Humidity'}
				</h2>
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
		{:else if (isSoilDevice ? soilTemperatureChartData.length === 0 : airTemperatureChartData.length === 0)}
			<div class="flex items-center justify-center h-[350px] text-slate-400">
				<p>No data available for chart</p>
			</div>
		{:else}
			{#if isSoilDevice}
				<div class="grid gap-6 lg:grid-cols-3">
					<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
							Soil Temperature
						</p>
						<CWLineChart
							data={soilTemperatureChartData}
							primaryLabel="Soil Temperature"
							primaryUnit="°C"
							threshold={soilTemperatureThreshold}
							height={260}
						/>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
							Soil Moisture
						</p>
						<CWLineChart
							data={soilMoistureChartData}
							primaryLabel="Soil Moisture"
							primaryUnit="%"
							threshold={soilMoistureThreshold}
							height={260}
						/>
					</div>
					<div class="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
						<p class="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">Soil EC</p>
						<CWLineChart
							data={soilEcChartData}
							primaryLabel="Soil EC"
							primaryUnit="mS/cm"
							threshold={soilEcThreshold}
							height={260}
						/>
					</div>
				</div>
			{:else}
				<CWLineChart
					data={airTemperatureChartData}
					secondaryData={airHumidityChartData}
					primaryLabel="Temperature"
					secondaryLabel="Humidity"
					primaryUnit="°C"
					secondaryUnit="%"
					threshold={airTemperatureThreshold}
					height={350}
				/>
			{/if}
		{/if}
	</section>
	{/if}

	{#if !isTrafficDevice}
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
	{/if}
</div>

<CWDialog bind:open={showDownloadModal} title="Download Device Data">
	<label
		class="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200"
	>
		<span class="text-xs uppercase tracking-wide text-slate-400">Range</span>
		<CWDateRangePicker rangeType="month" maxDate={new Date()} bind:value={lineDateRange} />
	</label>
	<div class="mt-4 text-sm text-slate-300">
		<input type="radio" name="format" value="csv" checked class="mr-2" /> CSV Format<br />
		<input type="radio" name="format" value="json" class="mr-2" /> PDF Format
	</div>
	<div class="mt-6 flex justify-end gap-4">
		<CWButton variant="secondary" onclick={() => (showDownloadModal = false)}>Cancel</CWButton>
	<CWButton
			onclick={() => {
				if (isTrafficDevice) {
					const normalizedRange = getTokyoMonthBounds(trafficRange.start ?? new Date());
					const csv = buildTrafficCsv(trafficRows, normalizedRange.start, normalizedRange.end);
					const safeName = (device?.name ?? page.params.dev_eui).replace(/\s+/g, '_');
					const filename = `traffic_${safeName}_${formatDateTZ(normalizedRange.start)}_to_${formatDateTZ(normalizedRange.end)}.csv`;
					downloadCsv(csv, filename);
				}
				showDownloadModal = false;
			}}
		>
			Download
		</CWButton>
	</div>
</CWDialog>
