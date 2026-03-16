<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';
	import { page } from '$app/state';
	import { ApiService } from '$lib/api/api.service';
	import {
		CwButton,
		CwCalendar,
		CwCard,
		CwChip,
		CwDataTable,
		CwSpinner,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult,
		type CwTone
	} from '@cropwatchdevelopment/cwui';
	import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';

	type TelemetryRow = Record<string, unknown>;
	type CsvRow = Record<string, string | number | null>;
	type HourlyCellValue = string | number | null;

	interface TrafficRow extends TelemetryRow {
		id: string;
		created_at: string;
		dev_eui: string;
	}

	interface HourlyTrafficRow {
		id: string;
		traffic_hour: string;
		day_key: string;
		hour_timestamp: number;
		total_traffic: number;
		samples: number;
		weather_summary: string;
		[key: string]: HourlyCellValue;
	}

	interface WeatherDaySummary {
		dayKey: string;
		summary: string;
		label: string;
		tone: CwTone;
		temperatureLabel: string | null;
		temperatureHighC: number | null;
		temperatureLowC: number | null;
		precipitationMm: number | null;
		windSpeedKmh: number | null;
		weatherCode: number | null;
	}

	interface DailyTrafficSummary {
		dayKey: string;
		date: Date;
		totalTraffic: number;
		hourCount: number;
		sampleCount: number;
		classTotals: Record<string, number>;
		weatherSummary: string;
		weatherLabel: string;
		weatherTone: CwTone;
		temperatureLabel: string | null;
		temperatureHighC: number | null;
		temperatureLowC: number | null;
		weatherCode: number | null;
		precipitationMm: number | null;
		windSpeedKmh: number | null;
	}

	const METADATA_KEYS = new Set([
		'id',
		'dev_eui',
		'created_at',
		'updated_at',
		'deleted_at',
		'is_simulated',
		'timestamp',
		'date',
		'time',
		'traffic_hour'
	]);

	const WEATHER_KEYWORDS = [
		'weather',
		'condition',
		'summary',
		'description',
		'icon',
		'temp',
		'temperature',
		'humidity',
		'wind',
		'rain',
		'snow',
		'precip',
		'pressure',
		'cloud',
		'fog',
		'dew',
		'uv',
		'visibility',
		'barometer',
		'feels_like',
		'feelslike'
	];

	const PRIORITY_TRAFFIC_KEYWORDS = [
		'count',
		'traffic',
		'vehicle',
		'volume',
		'car',
		'truck',
		'bus',
		'bike',
		'bicycle',
		'ped',
		'pedestrian',
		'person',
		'people',
		'north',
		'south',
		'east',
		'west',
		'inbound',
		'outbound',
		'entry',
		'exit',
		'lane',
		'bound',
		'class',
		'axle'
	];

	const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
	const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
	const OPEN_METEO_DAILY_FIELDS =
		'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max';

	let { latestData, historicalData, loading, locationName, devEui, authToken }: DeviceDisplayProps =
		$props();

	function isRecord(value: unknown): value is TelemetryRow {
		return typeof value === 'object' && value !== null && !Array.isArray(value);
	}

	function readNumber(value: unknown): number | null {
		if (typeof value === 'number' && Number.isFinite(value)) {
			return value;
		}

		if (typeof value === 'string' && value.trim().length > 0) {
			const parsed = Number(value);
			return Number.isFinite(parsed) ? parsed : null;
		}

		return null;
	}

	function readString(value: unknown): string | null {
		return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
	}

	function parseDate(value: unknown): Date | null {
		const text = readString(value);
		if (!text) return null;

		const parsed = new Date(text);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	function normalizeKey(key: string): string {
		return key.trim().toLowerCase();
	}

	function prettifyKey(key: string): string {
		return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
	}

	function toDayKey(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	function shiftDayKey(dayKey: string, days: number): string {
		return toDayKey(new Date(new Date(`${dayKey}T12:00:00`).getTime() + days * 86_400_000));
	}

	function toHourStart(date: Date): Date {
		return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
	}

	function toHourKey(date: Date): string {
		return `${toDayKey(date)} ${String(date.getHours()).padStart(2, '0')}:00`;
	}

	function formatHour(value: string | number): string {
		const date = typeof value === 'number' ? new Date(value) : parseDate(value);
		return date
			? date.toLocaleString(undefined, {
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				})
			: String(value);
	}

	function formatDay(value: Date): string {
		return value.toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function formatTrafficValue(value: unknown): string {
		const numeric = readNumber(value);
		return numeric === null ? '0' : numeric.toLocaleString();
	}

	function formatCoordinate(value: number | null): string {
		return value === null ? 'n/a' : value.toFixed(4);
	}

	function formatCompactTemperature(value: number | null): string {
		return value === null ? '--' : `${Math.round(value)}°`;
	}

	function formatMeasurement(value: number | null, suffix: string, digits = 0): string {
		return value === null ? `-- ${suffix}` : `${value.toFixed(digits)} ${suffix}`;
	}

	function metricEmoji(key: string): string {
		const normalized = normalizeKey(key);

		if (normalized.includes('truck')) return '🚚';
		if (normalized.includes('bus')) return '🚌';
		if (normalized.includes('bike') || normalized.includes('bicycle')) return '🚲';
		if (
			normalized.includes('ped') ||
			normalized.includes('person') ||
			normalized.includes('people')
		) {
			return '🚶';
		}
		if (normalized.includes('car') || normalized.includes('vehicle')) return '🚗';
		if (normalized.includes('motor')) return '🏍️';
		return '🚦';
	}

	function metricLabel(key: string): string {
		return `${metricEmoji(key)} ${prettifyKey(key)}`;
	}

	function weatherEmoji(code: number | null): string {
		if (code === 0 || code === 1) return '☀️';
		if (code === 2) return '🌤️';
		if (code === 3) return '☁️';
		if (code === 45 || code === 48) return '🌫️';
		if ([51, 53, 55, 56, 57].includes(code ?? -1)) return '🌦️';
		if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return '🌧️';
		if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return '❄️';
		if ([95, 96, 99].includes(code ?? -1)) return '⛈️';
		return '🌡️';
	}

	function emptyClassTotals(metricKeys: string[]): Record<string, number> {
		return Object.fromEntries(metricKeys.map((key) => [key, 0]));
	}

	function isWeatherKey(key: string): boolean {
		const normalized = normalizeKey(key);
		if (METADATA_KEYS.has(normalized)) return false;
		return WEATHER_KEYWORDS.some((keyword) => normalized.includes(keyword));
	}

	function isPriorityTrafficKey(key: string): boolean {
		const normalized = normalizeKey(key);
		return PRIORITY_TRAFFIC_KEYWORDS.some((keyword) => normalized.includes(keyword));
	}

	function normalizeTrafficRows(
		rows: unknown[],
		fallbackDevEui: string,
		extraRow?: unknown
	): TrafficRow[] {
		const seen: Record<string, true> = {};
		const result: TrafficRow[] = [];
		const candidates = [...rows];

		if (isRecord(extraRow)) {
			candidates.push(extraRow);
		}

		for (const [index, row] of candidates.entries()) {
			if (!isRecord(row)) continue;

			const createdAt = readString(row.created_at);
			const parsedDate = parseDate(createdAt);
			if (!createdAt || !parsedDate) continue;

			const id = String(row.id ?? row.data_id ?? `${createdAt}-${index}`);
			const dedupeKey = `${id}:${createdAt}`;
			if (seen[dedupeKey]) continue;

			seen[dedupeKey] = true;
			result.push({
				...row,
				id,
				created_at: createdAt,
				dev_eui: String(row.dev_eui ?? fallbackDevEui ?? '')
			});
		}

		return result.sort(
			(left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime()
		);
	}

	function resolveTrafficMetricKeys(rows: TrafficRow[]): string[] {
		const numericKeyMap: Record<string, true> = {};

		for (const row of rows) {
			for (const [key, value] of Object.entries(row)) {
				const normalized = normalizeKey(key);
				if (METADATA_KEYS.has(normalized) || isWeatherKey(key)) continue;
				if (readNumber(value) === null) continue;
				numericKeyMap[key] = true;
			}
		}

		const keys = Object.keys(numericKeyMap);
		const prioritized = keys.filter((key) => isPriorityTrafficKey(key));
		return (prioritized.length > 0 ? prioritized : keys).sort((left, right) =>
			left.localeCompare(right)
		);
	}

	function sumTrafficValues(row: TrafficRow, metricKeys: string[]): number {
		if (metricKeys.length === 0) {
			return 1;
		}

		return metricKeys.reduce((total, key) => total + (readNumber(row[key]) ?? 0), 0);
	}

	function resolveMissingWeatherState(loadingState: boolean): Omit<
		WeatherDaySummary,
		| 'dayKey'
		| 'temperatureHighC'
		| 'temperatureLowC'
		| 'precipitationMm'
		| 'windSpeedKmh'
		| 'weatherCode'
	> & {
		temperatureHighC: null;
		temperatureLowC: null;
		precipitationMm: null;
		windSpeedKmh: null;
		weatherCode: null;
	} {
		return {
			summary: loadingState ? 'Loading weather...' : 'Weather unavailable',
			label: loadingState ? 'Weather' : 'Unavailable',
			tone: 'secondary',
			temperatureLabel: null,
			temperatureHighC: null,
			temperatureLowC: null,
			precipitationMm: null,
			windSpeedKmh: null,
			weatherCode: null
		};
	}

	function describeWeatherCode(code: number | null): {
		label: string;
		description: string;
		tone: CwTone;
	} {
		if (code === 0) {
			return { label: 'Clear', description: 'Clear sky', tone: 'success' };
		}

		if (code === 1) {
			return { label: 'Mostly Clear', description: 'Mostly clear', tone: 'success' };
		}

		if (code === 2) {
			return { label: 'Partly Cloudy', description: 'Partly cloudy', tone: 'info' };
		}

		if (code === 3) {
			return { label: 'Cloudy', description: 'Overcast', tone: 'secondary' };
		}

		if (code === 45 || code === 48) {
			return { label: 'Fog', description: 'Foggy', tone: 'secondary' };
		}

		if ([51, 53, 55, 56, 57].includes(code ?? -1)) {
			return { label: 'Drizzle', description: 'Drizzle', tone: 'info' };
		}

		if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) {
			return { label: 'Rain', description: 'Rain', tone: 'info' };
		}

		if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) {
			return { label: 'Snow', description: 'Snow', tone: 'secondary' };
		}

		if ([95, 96, 99].includes(code ?? -1)) {
			return { label: 'Storm', description: 'Thunderstorm', tone: 'danger' };
		}

		return { label: 'Weather', description: 'Weather unavailable', tone: 'secondary' };
	}

	function buildWeatherDaySummary(
		dayKey: string,
		weatherCode: number | null,
		temperatureHighC: number | null,
		temperatureLowC: number | null,
		precipitationMm: number | null,
		windSpeedKmh: number | null
	): WeatherDaySummary {
		const descriptor = describeWeatherCode(weatherCode);
		const temperatureLabel =
			temperatureHighC !== null || temperatureLowC !== null
				? `${temperatureHighC !== null ? temperatureHighC.toFixed(0) : '--'}° / ${temperatureLowC !== null ? temperatureLowC.toFixed(0) : '--'}°C`
				: null;

		const summaryParts = [descriptor.description];
		if (temperatureLabel) {
			summaryParts.push(temperatureLabel);
		}

		if (precipitationMm !== null) {
			summaryParts.push(`${precipitationMm.toFixed(1)} mm precip`);
		}

		if (windSpeedKmh !== null) {
			summaryParts.push(`${windSpeedKmh.toFixed(0)} km/h wind`);
		}

		return {
			dayKey,
			summary: summaryParts.join(' • '),
			label: descriptor.label,
			tone: descriptor.tone,
			temperatureLabel,
			temperatureHighC,
			temperatureLowC,
			precipitationMm,
			windSpeedKmh,
			weatherCode
		};
	}

	function readCoordinate(source: TelemetryRow | null, key: 'lat' | 'long'): number | null {
		if (!source) return null;

		const directValue = readNumber(source[key]);
		if (directValue !== null) return directValue;

		const nestedLocation = isRecord(source.cw_locations) ? source.cw_locations : null;
		if (nestedLocation) {
			const nestedValue = readNumber(nestedLocation[key]);
			if (nestedValue !== null) return nestedValue;
		}

		return null;
	}

	function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
		const start = new Date(year, month, 1, 0, 0, 0, 0);
		const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
		return { start, end };
	}

	function getDayBounds(date: Date): { start: Date; end: Date } {
		const start = new Date(date);
		start.setHours(0, 0, 0, 0);

		const end = new Date(date);
		end.setHours(23, 59, 59, 999);

		return { start, end };
	}

	function normalizeWeatherPayload(payload: unknown): Record<string, WeatherDaySummary> {
		if (!isRecord(payload) || !isRecord(payload.daily) || !Array.isArray(payload.daily.time)) {
			return {};
		}

		const daily = payload.daily as Record<string, unknown> & { time: unknown[] };
		const result: Record<string, WeatherDaySummary> = {};

		for (const [index, rawDayKey] of daily.time.entries()) {
			const dayKey = readString(rawDayKey);
			if (!dayKey) continue;

			result[dayKey] = buildWeatherDaySummary(
				dayKey,
				readNumber(Array.isArray(daily.weather_code) ? daily.weather_code[index] : null),
				readNumber(
					Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max[index] : null
				),
				readNumber(
					Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min[index] : null
				),
				readNumber(Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum[index] : null),
				readNumber(Array.isArray(daily.wind_speed_10m_max) ? daily.wind_speed_10m_max[index] : null)
			);
		}

		return result;
	}

	const weatherCache = new SvelteMap<string, Record<string, WeatherDaySummary>>();

	async function fetchWeatherByRange(
		startDate: Date,
		endDate: Date,
		latitude: number,
		longitude: number
	): Promise<Record<string, WeatherDaySummary>> {
		const startDay = toDayKey(startDate);
		const endDay = toDayKey(endDate);
		const cacheKey = `${latitude.toFixed(4)}:${longitude.toFixed(4)}:${startDay}:${endDay}`;
		const cached = weatherCache.get(cacheKey);
		if (cached) {
			return cached;
		}

		const todayKey = toDayKey(new Date());
		const requests: Promise<Record<string, WeatherDaySummary>>[] = [];
		const addRequest = (baseUrl: string, requestStart: string, requestEnd: string) => {
			if (requestStart > requestEnd) return;

			const url = new URL(baseUrl);
			url.searchParams.set('latitude', String(latitude));
			url.searchParams.set('longitude', String(longitude));
			url.searchParams.set('daily', OPEN_METEO_DAILY_FIELDS);
			url.searchParams.set('timezone', 'auto');
			url.searchParams.set('start_date', requestStart);
			url.searchParams.set('end_date', requestEnd);

			requests.push(
				fetch(url.toString()).then(async (response) => {
					if (!response.ok) {
						throw new Error(`Weather request failed with ${response.status}`);
					}

					return normalizeWeatherPayload(await response.json());
				})
			);
		};

		if (endDay < todayKey) {
			addRequest(OPEN_METEO_ARCHIVE_URL, startDay, endDay);
		} else if (startDay >= todayKey) {
			addRequest(OPEN_METEO_FORECAST_URL, startDay, endDay);
		} else {
			addRequest(OPEN_METEO_ARCHIVE_URL, startDay, shiftDayKey(todayKey, -1));
			addRequest(OPEN_METEO_FORECAST_URL, todayKey, endDay);
		}

		const merged: Record<string, WeatherDaySummary> = {};
		for (const weatherResult of await Promise.all(requests)) {
			Object.assign(merged, weatherResult);
		}

		weatherCache.set(cacheKey, merged);
		return merged;
	}

	function buildHourlyTrafficRows(
		rows: TrafficRow[],
		metricKeys: string[],
		weatherByDay: Record<string, WeatherDaySummary>,
		weatherLoading: boolean
	): HourlyTrafficRow[] {
		const buckets: Record<string, HourlyTrafficRow> = {};

		for (const row of rows) {
			const timestamp = parseDate(row.created_at);
			if (!timestamp) continue;

			const hourStart = toHourStart(timestamp);
			const hourKey = toHourKey(hourStart);
			let bucket = buckets[hourKey];

			if (!bucket) {
				bucket = {
					id: hourKey,
					traffic_hour: hourStart.toISOString(),
					day_key: toDayKey(hourStart),
					hour_timestamp: hourStart.getTime(),
					total_traffic: 0,
					samples: 0,
					weather_summary: ''
				};

				for (const key of metricKeys) {
					bucket[key] = 0;
				}

				buckets[hourKey] = bucket;
			}

			bucket.samples += 1;
			bucket.total_traffic += sumTrafficValues(row, metricKeys);

			for (const key of metricKeys) {
				bucket[key] = (readNumber(bucket[key]) ?? 0) + (readNumber(row[key]) ?? 0);
			}
		}

		const missingWeatherState = resolveMissingWeatherState(weatherLoading);
		return Object.values(buckets)
			.sort((left, right) => left.hour_timestamp - right.hour_timestamp)
			.map((row) => ({
				...row,
				weather_summary: weatherByDay[row.day_key]?.summary ?? missingWeatherState.summary
			}));
	}

	function buildDailyTrafficSummaries(
		rows: TrafficRow[],
		metricKeys: string[],
		weatherByDay: Record<string, WeatherDaySummary>,
		weatherLoading: boolean
	): DailyTrafficSummary[] {
		type DailyAccumulator = {
			dayKey: string;
			date: Date;
			totalTraffic: number;
			sampleCount: number;
			hourKeys: Record<string, true>;
			classTotals: Record<string, number>;
		};

		const dailyTotals: Record<string, DailyAccumulator> = {};

		for (const row of rows) {
			const timestamp = parseDate(row.created_at);
			if (!timestamp) continue;

			const dayKey = toDayKey(timestamp);
			let daily = dailyTotals[dayKey];
			if (!daily) {
				daily = {
					dayKey,
					date: new Date(timestamp),
					totalTraffic: 0,
					sampleCount: 0,
					hourKeys: {},
					classTotals: emptyClassTotals(metricKeys)
				};
				dailyTotals[dayKey] = daily;
			}

			daily.totalTraffic += sumTrafficValues(row, metricKeys);
			daily.sampleCount += 1;
			daily.hourKeys[toHourKey(timestamp)] = true;
			for (const key of metricKeys) {
				daily.classTotals[key] = (daily.classTotals[key] ?? 0) + (readNumber(row[key]) ?? 0);
			}
		}

		for (const dayKey of Object.keys(weatherByDay)) {
			if (dailyTotals[dayKey]) continue;

			dailyTotals[dayKey] = {
				dayKey,
				date: new Date(`${dayKey}T12:00:00`),
				totalTraffic: 0,
				sampleCount: 0,
				hourKeys: {},
				classTotals: emptyClassTotals(metricKeys)
			};
		}

		const missingWeatherState = resolveMissingWeatherState(weatherLoading);
		return Object.values(dailyTotals)
			.sort((left, right) => left.date.getTime() - right.date.getTime())
			.map((daily) => {
				const weather = weatherByDay[daily.dayKey] ?? {
					dayKey: daily.dayKey,
					...missingWeatherState
				};
				return {
					dayKey: daily.dayKey,
					date: daily.date,
					totalTraffic: daily.totalTraffic,
					hourCount: Object.keys(daily.hourKeys).length,
					sampleCount: daily.sampleCount,
					classTotals: daily.classTotals,
					weatherSummary: weather.summary,
					weatherLabel: weather.label,
					weatherTone: weather.tone,
					temperatureLabel: weather.temperatureLabel,
					temperatureHighC: weather.temperatureHighC,
					temperatureLowC: weather.temperatureLowC,
					weatherCode: weather.weatherCode,
					precipitationMm: weather.precipitationMm,
					windSpeedKmh: weather.windSpeedKmh
				};
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
		const columns = [
			...ordered,
			...Object.keys(keyMap).sort((left, right) => left.localeCompare(right))
		];
		const escape = (value: unknown): string => {
			const text = value == null ? '' : String(value);
			return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
		};

		const csv = [
			columns.join(','),
			...rows.map((row) => columns.map((column) => escape(row[column])).join(','))
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

	let routeDevice = $derived.by<TelemetryRow | null>(() => {
		const routeData = page.data as Record<string, unknown>;
		return isRecord(routeData.device) ? routeData.device : null;
	});

	let now = $state(new Date());
	let deviceLatitude = $derived.by<number | null>(() => readCoordinate(routeDevice, 'lat'));
	let deviceLongitude = $derived.by<number | null>(() => readCoordinate(routeDevice, 'long'));
	let weatherLocationLabel = $derived(
		deviceLatitude !== null && deviceLongitude !== null
			? `${formatCoordinate(deviceLatitude)}, ${formatCoordinate(deviceLongitude)}`
			: 'Device coordinates unavailable'
	);

	let allRows = $derived.by<TrafficRow[]>(() =>
		normalizeTrafficRows(historicalData, devEui, latestData)
	);
	let todayBounds = $derived.by(() => getDayBounds(now));
	let todayDayKey = $derived(toDayKey(todayBounds.start));
	let todayRows = $derived.by<TrafficRow[]>(() => {
		const { start, end } = todayBounds;

		return allRows.filter((row) => {
			const timestamp = parseDate(row.created_at);
			return timestamp !== null && timestamp >= start && timestamp <= end;
		});
	});
	let trafficMetricKeys = $derived.by<string[]>(() => resolveTrafficMetricKeys(todayRows));
	let selectedPeriodMetricTotals = $derived.by<Record<string, number>>(() =>
		Object.fromEntries(
			trafficMetricKeys.map((key) => [
				key,
				todayRows.reduce((total, row) => total + (readNumber(row[key]) ?? 0), 0)
			])
		)
	);

	let selectedWeatherByDay = $state<Record<string, WeatherDaySummary>>({});
	let selectedWeatherLoading = $state(false);
	let selectedWeatherError = $state<string | null>(null);
	let selectedWeatherRequestId = 0;

	let hourlyRows = $derived.by<HourlyTrafficRow[]>(() =>
		buildHourlyTrafficRows(
			todayRows,
			trafficMetricKeys,
			selectedWeatherByDay,
			selectedWeatherLoading
		)
	);

	let dailySummaries = $derived.by<DailyTrafficSummary[]>(() =>
		buildDailyTrafficSummaries(
			todayRows,
			trafficMetricKeys,
			selectedWeatherByDay,
			selectedWeatherLoading
		)
	);

	let dailySummaryByKey = $derived.by<Record<string, DailyTrafficSummary>>(() =>
		Object.fromEntries(dailySummaries.map((summary) => [summary.dayKey, summary]))
	);

	let selectedPeriodTotal = $derived(
		hourlyRows.reduce((total, row) => total + row.total_traffic, 0)
	);

	let currentHourKey = $derived.by(() => toHourKey(toHourStart(now)));
	let currentHourRow = $derived.by<HourlyTrafficRow | null>(() => {
		return (
			hourlyRows.find((row) => row.id === currentHourKey) ??
			hourlyRows[hourlyRows.length - 1] ??
			null
		);
	});

	let currentDaySummary = $derived.by<DailyTrafficSummary | null>(() => {
		return dailySummaryByKey[todayDayKey] ?? null;
	});

	let currentHourLabel = $derived(
		currentHourRow?.id === currentHourKey ? 'Current hour today' : 'Latest available hour today'
	);

	let hourlyColumns = $derived<CwColumnDef<HourlyTrafficRow>[]>([
		{ key: 'traffic_hour', header: 'Hour', sortable: true, width: '14rem' },
		{ key: 'total_traffic', header: 'Total Traffic', sortable: true, width: '8rem' },
		{ key: 'samples', header: 'Samples', sortable: true, width: '7rem' },
		...trafficMetricKeys.map((key) => ({
			key,
			header: prettifyKey(key),
			sortable: true,
			width: '8rem'
		})),
		{ key: 'weather_summary', header: 'Weather', sortable: true, width: '20rem' }
	]);

	let tableLoading = $state(false);
	let csvDownloading = $state(false);

	let calendarYear = $state(new Date().getFullYear());
	let calendarMonth = $state(new Date().getMonth());
	let trackedCalendarDevice = $state('');
	let calendarMonthRows = $state<TrafficRow[]>([]);
	let calendarWeatherByDay = $state<Record<string, WeatherDaySummary>>({});
	let calendarLoading = $state(false);
	let calendarError = $state<string | null>(null);
	let calendarRequestId = 0;
	let lastSelectedWeatherKey = $state('');
	let lastCalendarLoadKey = $state('');

	let calendarMonthLabel = $derived(
		new Date(calendarYear, calendarMonth, 1).toLocaleDateString(undefined, {
			month: 'long',
			year: 'numeric'
		})
	);
	let calendarTrafficMetricKeys = $derived.by<string[]>(() =>
		resolveTrafficMetricKeys(calendarMonthRows)
	);

	let calendarDailySummaries = $derived.by<DailyTrafficSummary[]>(() =>
		buildDailyTrafficSummaries(
			calendarMonthRows,
			calendarTrafficMetricKeys,
			calendarWeatherByDay,
			calendarLoading
		)
	);

	let calendarSummaryByKey = $derived.by<Record<string, DailyTrafficSummary>>(() =>
		Object.fromEntries(calendarDailySummaries.map((summary) => [summary.dayKey, summary]))
	);

	async function refreshSelectedWeather(): Promise<void> {
		const bounds = todayBounds;
		const dayKey = todayDayKey;
		const latitude = deviceLatitude;
		const longitude = deviceLongitude;
		const key = `${dayKey}:${latitude ?? 'na'}:${longitude ?? 'na'}`;

		if (key === lastSelectedWeatherKey) {
			return;
		}

		lastSelectedWeatherKey = key;

		selectedWeatherRequestId += 1;
		const requestId = selectedWeatherRequestId;

		if (latitude === null || longitude === null) {
			selectedWeatherByDay = {};
			selectedWeatherLoading = false;
			selectedWeatherError = 'Weather requires device latitude and longitude.';
			return;
		}

		selectedWeatherByDay = {};
		selectedWeatherLoading = true;
		selectedWeatherError = null;

		try {
			const weather = await fetchWeatherByRange(bounds.start, bounds.end, latitude, longitude);
			if (requestId !== selectedWeatherRequestId) return;
			selectedWeatherByDay = weather;
		} catch (error) {
			if (requestId !== selectedWeatherRequestId) return;
			console.error('Failed to fetch selected-period weather:', error);
			selectedWeatherByDay = {};
			selectedWeatherError = 'Unable to load weather for today.';
		} finally {
			if (requestId === selectedWeatherRequestId) {
				selectedWeatherLoading = false;
			}
		}
	}

	async function refreshCalendarMonth(): Promise<void> {
		const deviceKey = devEui.trim();
		const token = authToken;
		const year = calendarYear;
		const month = calendarMonth;
		const latitude = deviceLatitude;
		const longitude = deviceLongitude;
		const key = `${deviceKey}:${token ?? 'no-token'}:${year}:${month}:${latitude ?? 'na'}:${longitude ?? 'na'}`;

		if (key === lastCalendarLoadKey) {
			return;
		}

		lastCalendarLoadKey = key;

		calendarRequestId += 1;
		const requestId = calendarRequestId;

		if (!deviceKey || !token) {
			calendarMonthRows = [];
			calendarWeatherByDay = {};
			calendarLoading = false;
			calendarError = deviceKey ? 'Calendar data requires an authenticated session.' : null;
			return;
		}

		const { start, end } = getMonthBounds(year, month);
		calendarMonthRows = [];
		calendarWeatherByDay = {};
		calendarLoading = true;
		calendarError = null;

		try {
			const api = new ApiService({ fetchFn: fetch, authToken: token });
			const trafficPromise = api.getTrafficData(deviceKey, {
				start: start.toISOString(),
				end: end.toISOString()
			});
			const weatherPromise =
				latitude !== null && longitude !== null
					? fetchWeatherByRange(start, end, latitude, longitude).catch((error) => {
							console.error('Failed to fetch calendar weather:', error);
							return {};
						})
					: Promise.resolve({});

			const [trafficData, weatherByDay] = await Promise.all([trafficPromise, weatherPromise]);
			if (requestId !== calendarRequestId) return;

			calendarMonthRows = normalizeTrafficRows(trafficData, deviceKey);
			calendarWeatherByDay = weatherByDay;
		} catch (error) {
			if (requestId !== calendarRequestId) return;
			console.error('Failed to fetch calendar month traffic:', error);
			calendarMonthRows = [];
			calendarWeatherByDay = {};
			calendarError = 'Unable to load traffic for the visible month.';
		} finally {
			if (requestId === calendarRequestId) {
				calendarLoading = false;
			}
		}
	}

	onMount(() => {
		const devicePage = document.querySelector('.traffic-display')?.closest('.device-page');
		devicePage?.classList.add('device-page--traffic');

		const synchronize = () => {
			now = new Date();

			if (devEui !== trackedCalendarDevice) {
				trackedCalendarDevice = devEui;
				const anchor = parseDate(isRecord(latestData) ? latestData.created_at : null) ?? now;
				calendarYear = anchor.getFullYear();
				calendarMonth = anchor.getMonth();
				lastCalendarLoadKey = '';
			}

			void refreshSelectedWeather();
			void refreshCalendarMonth();
		};

		synchronize();
		const intervalId = window.setInterval(synchronize, 250);
		return () => {
			window.clearInterval(intervalId);
			devicePage?.classList.remove('device-page--traffic');
		};
	});

	function buildCsvRows(weatherByDay: Record<string, WeatherDaySummary>): CsvRow[] {
		return hourlyRows.map((row) => {
			const weather = weatherByDay[row.day_key];
			const csvRow: CsvRow = {
				traffic_hour: formatHour(row.traffic_hour),
				day: formatDay(new Date(row.hour_timestamp)),
				total_traffic: row.total_traffic,
				samples: row.samples,
				weather_label: weather?.label ?? 'Unavailable',
				weather_summary: weather?.summary ?? 'Weather unavailable',
				weather_code: weather?.weatherCode ?? null,
				weather_temp_high_c: weather?.temperatureHighC ?? null,
				weather_temp_low_c: weather?.temperatureLowC ?? null,
				weather_precip_mm: weather?.precipitationMm ?? null,
				weather_wind_kmh: weather?.windSpeedKmh ?? null
			};

			for (const key of trafficMetricKeys) {
				csvRow[key] = readNumber(row[key]) ?? 0;
			}

			return csvRow;
		});
	}

	function buildCsvFilename(): string {
		const safeLocation = locationName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'location';
		const safeDevEui = devEui.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'device';
		return `${safeLocation}-${safeDevEui}-${todayDayKey}-traffic-hourly.csv`;
	}

	async function handleCsvDownload(): Promise<void> {
		if (hourlyRows.length === 0) return;

		let weatherByDay = selectedWeatherByDay;
		const bounds = todayBounds;
		const latitude = deviceLatitude;
		const longitude = deviceLongitude;

		if (bounds && latitude !== null && longitude !== null) {
			csvDownloading = true;
			try {
				weatherByDay = await fetchWeatherByRange(bounds.start, bounds.end, latitude, longitude);
			} catch (error) {
				console.error('Failed to refresh CSV weather:', error);
			} finally {
				csvDownloading = false;
			}
		}

		downloadCsv(buildCsvRows(weatherByDay), buildCsvFilename());
	}

	function handleCalendarMonthChange(year: number, month: number): void {
		calendarYear = year;
		calendarMonth = month;
	}

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
						row.weather_summary,
						row.total_traffic,
						row.samples,
						...trafficMetricKeys.map((key) => row[key] ?? '')
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
</script>

<div class="traffic-display">
	<div class="traffic-display__summary-grid">
		<CwCard title="Current Hour Total" subtitle={currentHourLabel} elevated>
			{#if loading && !currentHourRow}
				<div class="traffic-display__status">
					<CwSpinner />
					<span>Loading current traffic...</span>
				</div>
			{:else if currentHourRow}
				<p class="traffic-display__kpi">
					{currentHourRow.total_traffic.toLocaleString()}
					<span>{formatHour(currentHourRow.traffic_hour)}</span>
				</p>

				<div class="traffic-display__chips">
					<CwChip
						label={`${currentHourRow.samples.toLocaleString()} samples`}
						tone="secondary"
						variant="soft"
					/>
				</div>

				{#if trafficMetricKeys.length > 0}
					<div class="traffic-display__metric-panel">
						{#each trafficMetricKeys as key (key)}
							<div class="traffic-display__metric-row">
								<span>{metricLabel(key)}</span>
								<strong>{formatTrafficValue(currentHourRow[key])}</strong>
							</div>
						{/each}
					</div>
				{/if}
			{:else}
				<p class="traffic-display__supporting-copy">No traffic data is available for today.</p>
			{/if}
		</CwCard>

		<CwCard
			title="Selected Period"
			subtitle={hourlyRows.length > 0 ? 'Today only' : 'No traffic today'}
			elevated
		>
			<p class="traffic-display__kpi">
				{selectedPeriodTotal.toLocaleString()}
				<span>{hourlyRows.length.toLocaleString()} tracked hour(s)</span>
			</p>

			<div class="traffic-display__chips">
				<CwChip
					label={`${todayRows.length.toLocaleString()} raw records`}
					tone="secondary"
					variant="soft"
				/>
				<CwChip
					label={`${dailySummaries.length.toLocaleString()} weather day(s)`}
					tone="success"
					variant="soft"
				/>
			</div>

			{#if trafficMetricKeys.length > 0}
				<div class="traffic-display__metric-panel">
					{#each trafficMetricKeys as key (key)}
						<div class="traffic-display__metric-row">
							<span>{metricLabel(key)}</span>
							<strong>{formatTrafficValue(selectedPeriodMetricTotals[key])}</strong>
						</div>
					{/each}
				</div>
			{/if}
		</CwCard>

		<CwCard title="Daily Weather" subtitle="Today via device coordinates" elevated>
			{#if selectedWeatherLoading && !currentDaySummary}
				<div class="traffic-display__status traffic-display__status--compact">
					<CwSpinner />
					<span>Loading weather...</span>
				</div>
			{:else if currentDaySummary}
				<div class="traffic-display__weather-panel">
					<div class="traffic-display__weather-topline">
						<p class="traffic-display__weather-temperature">
							{weatherEmoji(currentDaySummary.weatherCode)}
							{formatCompactTemperature(currentDaySummary.temperatureHighC)}
						</p>
						<p class="traffic-display__weather-low">
							Low {formatCompactTemperature(currentDaySummary.temperatureLowC)}
						</p>
					</div>

					<p class="traffic-display__weather-label">
						{weatherEmoji(currentDaySummary.weatherCode)}
						{currentDaySummary.weatherLabel}
					</p>

					<div class="traffic-display__chips">
						<CwChip
							label={`💧 ${formatMeasurement(currentDaySummary.precipitationMm, 'mm', 1)}`}
							tone="info"
							variant="soft"
						/>
						<CwChip
							label={`💨 ${formatMeasurement(currentDaySummary.windSpeedKmh, 'km/h')}`}
							tone="secondary"
							variant="soft"
						/>
						<CwChip
							label={`📍 ${weatherLocationLabel}`}
							tone={deviceLatitude !== null && deviceLongitude !== null ? 'secondary' : 'warning'}
							variant="soft"
						/>
					</div>

					<p class="traffic-display__supporting-copy">{currentDaySummary.weatherSummary}</p>
				</div>
			{:else if selectedWeatherError}
				<p class="traffic-display__supporting-copy">{selectedWeatherError}</p>
			{:else}
				<p class="traffic-display__supporting-copy">Weather unavailable.</p>
			{/if}
		</CwCard>
	</div>

	<CwCard title="Hourly Traffic" subtitle="Summed by hour for today" elevated>
		<div class="traffic-display__actions">
			<CwButton
				variant="secondary"
				size="sm"
				disabled={hourlyRows.length === 0 || csvDownloading}
				onclick={handleCsvDownload}
			>
				{csvDownloading ? 'Preparing CSV...' : 'Download Hourly CSV'}
			</CwButton>
		</div>

		{#if loading && hourlyRows.length === 0}
			<div class="traffic-display__status">
				<CwSpinner />
				<span>Fetching traffic data...</span>
			</div>
		{:else if hourlyRows.length === 0}
			<p class="traffic-display__supporting-copy">No traffic data is available for today.</p>
		{:else}
			<CwDataTable
				columns={hourlyColumns}
				loadData={loadHourlyData}
				loading={tableLoading}
				rowKey="id"
				searchable
			>
				{#snippet cell(
					row: HourlyTrafficRow,
					col: CwColumnDef<HourlyTrafficRow>,
					defaultValue: string
				)}
					{#if col.key === 'traffic_hour'}
						{formatHour(row.traffic_hour)}
					{:else if col.key === 'total_traffic' || col.key === 'samples'}
						{formatTrafficValue(row[col.key])}
					{:else if col.key === 'weather_summary'}
						{row.weather_summary}
					{:else}
						{formatTrafficValue(row[col.key] ?? defaultValue)}
					{/if}
				{/snippet}
			</CwDataTable>
		{/if}
	</CwCard>

	<CwCard
		title="Daily Traffic & Weather"
		subtitle={`${calendarMonthLabel} calendar fetch`}
		elevated
	>
		<div class="traffic-display__calendar-meta">
			<CwChip
				label={`Month traffic ${calendarDailySummaries.length.toLocaleString()} day(s)`}
				tone="info"
				variant="soft"
			/>
			<CwChip
				label={`Lat/Lng ${weatherLocationLabel}`}
				tone={deviceLatitude !== null && deviceLongitude !== null ? 'secondary' : 'warning'}
				variant="soft"
			/>

			{#if calendarLoading}
				<CwChip label="Loading visible month..." tone="secondary" variant="soft" />
			{/if}

			{#if calendarError}
				<CwChip label={calendarError} tone="danger" variant="soft" />
			{:else if !calendarLoading && calendarDailySummaries.length === 0}
				<CwChip label="No traffic recorded for this month" tone="secondary" variant="soft" />
			{/if}
		</div>

		<CwCalendar
			bind:year={calendarYear}
			bind:month={calendarMonth}
			maxDate={new Date()}
			onMonthChange={handleCalendarMonthChange}
			class="traffic-display__calendar"
		>
			{#snippet dayContent(date)}
				{@const summary = calendarSummaryByKey[toDayKey(date)]}
				{#if summary}
					<div class="traffic-display__calendar-summary">
						<div class="traffic-display__calendar-weather-panel">
							<div class="traffic-display__calendar-weather-topline">
								<p class="traffic-display__calendar-weather-temp">
									{formatCompactTemperature(summary.temperatureHighC)}
								</p>
								<p class="traffic-display__calendar-weather-low">
									Low {formatCompactTemperature(summary.temperatureLowC)}
								</p>
							</div>

							<p class="traffic-display__calendar-weather-label">
								{weatherEmoji(summary.weatherCode)}
								{summary.weatherLabel}
							</p>
							<p class="traffic-display__calendar-copy">
								💧 {formatMeasurement(summary.precipitationMm, 'mm', 1)}
							</p>
						</div>

						<div class="traffic-display__calendar-traffic-panel">
							<p class="traffic-display__calendar-section-heading">
								🚦 Traffic Total: {summary.totalTraffic.toLocaleString()}
							</p>

							{#if calendarTrafficMetricKeys.length > 0}
								<div class="traffic-display__calendar-class-list">
									{#each calendarTrafficMetricKeys as key (key)}
										<p class="traffic-display__calendar-copy">
											{metricLabel(key)}: {formatTrafficValue(summary.classTotals[key])}
										</p>
									{/each}
								</div>
							{:else}
								<p class="traffic-display__calendar-copy">No class data recorded.</p>
							{/if}
						</div>
					</div>
				{/if}
			{/snippet}
		</CwCalendar>
	</CwCard>
</div>

<style>
	.traffic-display {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.traffic-display__summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.traffic-display__kpi {
		margin: 0 0 0.85rem;
		font-size: clamp(1.5rem, 2.2vw, 2.2rem);
		font-weight: 700;
		color: var(--cw-text-primary);
	}

	.traffic-display__kpi span {
		display: block;
		margin-top: 0.35rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--cw-text-muted);
	}

	.traffic-display__chips,
	.traffic-display__calendar-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.traffic-display__actions {
		display: flex;
		justify-content: flex-end;
		margin-bottom: 0.75rem;
	}

	.traffic-display__metric-panel {
		display: grid;
		gap: 0.45rem;
		margin-top: 0.9rem;
	}

	.traffic-display__metric-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.55rem 0.7rem;
		border-radius: 0.85rem;
		border: 1px solid color-mix(in srgb, var(--cw-border-default) 46%, transparent);
		background: color-mix(in srgb, var(--cw-surface, #f8fafc) 86%, #dbeafe 14%);
		font-size: 0.95rem;
	}

	.traffic-display__metric-row strong {
		font-size: 1rem;
		color: var(--cw-text-primary);
	}

	.traffic-display__status {
		display: inline-flex;
		align-items: center;
		gap: 0.75rem;
		color: var(--cw-text-muted);
	}

	.traffic-display__status--compact {
		margin-top: 0.75rem;
	}

	.traffic-display__supporting-copy,
	.traffic-display__calendar-copy {
		margin: 0.5rem 0 0;
		font-size: 0.9rem;
		color: var(--cw-text-secondary);
	}

	.traffic-display__calendar-summary {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.35rem;
	}

	.traffic-display__weather-panel,
	.traffic-display__calendar-weather-panel,
	.traffic-display__calendar-traffic-panel {
		width: 100%;
		border-radius: 0.95rem;
		padding: 0.75rem;
		border: 1px solid transparent;
		box-shadow: inset 0 1px 0 color-mix(in srgb, #ffffff 22%, transparent);
	}

	.traffic-display__weather-panel,
	.traffic-display__calendar-weather-panel {
		background: linear-gradient(180deg, #8cc8ff 0%, #72b5f2 100%);
		color: #0f172a;
	}

	.traffic-display__calendar-traffic-panel {
		background: linear-gradient(180deg, #1f5ca8 0%, #18498a 100%);
		color: #eff6ff;
	}

	.traffic-display__weather-topline,
	.traffic-display__calendar-weather-topline {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.traffic-display__weather-temperature,
	.traffic-display__calendar-weather-temp {
		margin: 0;
		font-size: 1.8rem;
		font-weight: 700;
		line-height: 1;
	}

	.traffic-display__weather-low,
	.traffic-display__calendar-weather-low {
		margin: 0.15rem 0 0;
		font-size: 0.82rem;
		font-weight: 600;
	}

	.traffic-display__weather-label,
	.traffic-display__calendar-weather-label,
	.traffic-display__calendar-section-heading {
		margin: 0.6rem 0 0.25rem;
		font-size: 0.98rem;
		font-weight: 700;
	}

	.traffic-display__calendar-class-list {
		display: grid;
		gap: 0.15rem;
	}

	.traffic-display__calendar-copy {
		line-height: 1.3;
		word-break: break-word;
	}

	.traffic-display__weather-panel .traffic-display__supporting-copy,
	.traffic-display__weather-panel :global(.cw-chip),
	.traffic-display__calendar-weather-panel .traffic-display__calendar-copy,
	.traffic-display__calendar-weather-panel .traffic-display__calendar-weather-label {
		color: inherit;
	}

	.traffic-display__calendar-traffic-panel .traffic-display__calendar-copy,
	.traffic-display__calendar-traffic-panel .traffic-display__calendar-section-heading {
		color: inherit;
	}

	[data-theme='dark'] .traffic-display__metric-row {
		background: color-mix(in srgb, var(--cw-bg-surface-elevated) 80%, var(--cw-info-800) 20%);
		border-color: color-mix(in srgb, var(--cw-info-400) 20%, var(--cw-border-default));
		color: var(--cw-text-primary);
	}

	[data-theme='dark'] .traffic-display__weather-panel,
	[data-theme='dark'] .traffic-display__calendar-weather-panel {
		background:
			radial-gradient(
				130% 100% at 0% 0%,
				color-mix(in srgb, var(--cw-info-300) 18%, transparent),
				transparent 55%
			),
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--cw-info-600) 32%, var(--cw-bg-surface-elevated)) 0%,
				color-mix(in srgb, var(--cw-info-900) 42%, var(--cw-bg-surface)) 100%
			);
		color: #eff6ff;
		border-color: color-mix(in srgb, var(--cw-info-300) 30%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #ffffff 12%, transparent),
			0 8px 18px color-mix(in srgb, #050a16 36%, transparent);
	}

	[data-theme='dark'] .traffic-display__calendar-traffic-panel {
		background:
			radial-gradient(
				120% 100% at 100% 0%,
				color-mix(in srgb, var(--cw-primary-300) 16%, transparent),
				transparent 58%
			),
			linear-gradient(
				180deg,
				color-mix(in srgb, var(--cw-primary-800) 34%, var(--cw-bg-surface-elevated)) 0%,
				color-mix(in srgb, var(--cw-primary-900) 48%, var(--cw-bg-surface)) 100%
			);
		color: #f8fbff;
		border-color: color-mix(in srgb, var(--cw-primary-300) 24%, transparent);
		box-shadow:
			inset 0 1px 0 color-mix(in srgb, #ffffff 10%, transparent),
			0 8px 18px color-mix(in srgb, #050a16 38%, transparent);
	}

	[data-theme='dark'] .traffic-display__weather-panel :global(.cw-chip),
	[data-theme='dark'] .traffic-display__calendar-weather-panel :global(.cw-chip) {
		box-shadow: inset 0 0 0 1px color-mix(in srgb, #ffffff 6%, transparent);
	}

	:global(.traffic-display__calendar .cw-calendar__day-body) {
		gap: 0.5rem;
	}

	:global(.traffic-display__calendar .cw-calendar__day) {
		min-height: 16rem;
	}

	:global(.device-page--traffic .device-page__group--ranges) {
		display: none;
	}

	@media (max-width: 640px) {
		.traffic-display__actions {
			justify-content: stretch;
		}

		.traffic-display__actions :global(button) {
			width: 100%;
		}
	}
</style>
