/**
 * Pure data helpers for the traffic (AI camera) display.
 *
 * cw_traffic2 rows are hourly accumulator buckets: one row per
 * (dev_eui, traffic_hour, line_number), incremented in place. Bucketing here
 * therefore keys on `traffic_hour` (falling back to the created_at hour) and
 * sums across line_number rows that share an hour.
 */
import { formatDate, formatDateTime, formatNumber } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';

export type TelemetryRow = Record<string, unknown>;

export interface TrafficRow extends TelemetryRow {
	id: string;
	created_at: string;
	dev_eui: string;
}

export interface HourlyTrafficRow {
	id: string;
	traffic_hour: string;
	day_key: string;
	hour_timestamp: number;
	total_traffic: number;
	samples: number;
	[key: string]: string | number;
}

export interface DailyTrafficSummary {
	dayKey: string;
	date: Date;
	totalTraffic: number;
	hourCount: number;
	sampleCount: number;
	classTotals: Record<string, number>;
}

export interface TrafficKpis {
	todayTotal: number;
	trackedHours: number;
	sampleCount: number;
	currentHourRow: HourlyTrafficRow | null;
	/** True when currentHourRow is genuinely this hour (vs latest available). */
	isCurrentHour: boolean;
	peakHourRow: HourlyTrafficRow | null;
	topClassKey: string | null;
	classTotals: Record<string, number>;
}

/**
 * Known cw_traffic2 detection classes in fixed display order — the stack
 * order (bottom first) and the color assignment both follow this order, so
 * a class keeps its color no matter which classes are present or hidden.
 */
export const TRAFFIC_CLASS_KEYS = [
	'car_count',
	'people_count',
	'truck_count',
	'bicycle_count',
	'bus_count',
	'motorcycle_count',
	'train_count'
] as const;

/**
 * Categorical palette for traffic classes (light/dark steps of the same
 * hues), indexed by position in TRAFFIC_CLASS_KEYS. Validated for CVD
 * separation and normal-vision distance on the CWUI light/dark surfaces.
 * Matches CwStackedBarChart's default palette so chart and breakdown agree.
 */
const TRAFFIC_CLASS_COLORS = {
	light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
	dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
} as const;

export function trafficClassColor(theme: 'light' | 'dark', classIndex: number): string {
	const palette = TRAFFIC_CLASS_COLORS[theme];
	return palette[classIndex % palette.length];
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
	'traffic_hour',
	'line_number'
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

/* ── Value guards ─────────────────────────────────────────────────────── */

export function isRecord(value: unknown): value is TelemetryRow {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string' && value.trim().length > 0) {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

export function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function parseDate(value: unknown): Date | null {
	const text = readString(value);
	if (!text) return null;

	const parsed = new Date(text);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeKey(key: string): string {
	return key.trim().toLowerCase();
}

/* ── Date/format helpers (all in the viewer's local timezone) ─────────── */

export function toDayKey(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

export function shiftDayKey(dayKey: string, days: number): string {
	return toDayKey(new Date(new Date(`${dayKey}T12:00:00`).getTime() + days * 86_400_000));
}

export function toHourStart(date: Date): Date {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours());
}

export function toHourKey(date: Date): string {
	return `${toDayKey(date)} ${String(date.getHours()).padStart(2, '0')}:00`;
}

export function getDayBounds(date: Date): { start: Date; end: Date } {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);

	const end = new Date(date);
	end.setHours(23, 59, 59, 999);

	return { start, end };
}

export function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
	const start = new Date(year, month, 1, 0, 0, 0, 0);
	const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
	return { start, end };
}

export function formatHour(value: string | number): string {
	const date = typeof value === 'number' ? new Date(value) : parseDate(value);
	return date
		? formatDateTime(date, {
				month: 'short',
				day: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			})
		: String(value);
}

export function formatDay(value: Date): string {
	return formatDate(value, {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

export function formatMeasurement(value: number | null, suffix: string, digits = 0): string {
	return value === null ? `-- ${suffix}` : `${value.toFixed(digits)} ${suffix}`;
}

export function formatTrafficValue(value: unknown): string {
	const numeric = readNumber(value);
	return numeric === null ? '0' : formatNumber(numeric);
}

/* ── Class labels ─────────────────────────────────────────────────────── */

export function metricEmoji(key: string): string {
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
	if (normalized.includes('train')) return '🚆';
	if (normalized.includes('car') || normalized.includes('vehicle')) return '🚗';
	if (normalized.includes('motor')) return '🏍️';
	return '🚦';
}

const METRIC_LABEL_KEYS: Record<string, () => string> = {
	bicycle_count: () => m.traffic_metric_bicycle_count(),
	bus_count: () => m.traffic_metric_bus_count(),
	car_count: () => m.traffic_metric_car_count(),
	motorcycle_count: () => m.traffic_metric_motorcycle_count(),
	people_count: () => m.traffic_metric_people_count(),
	train_count: () => m.traffic_metric_train_count(),
	truck_count: () => m.traffic_metric_truck_count()
};

function prettifyKey(key: string): string {
	return key.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/** Translated class name without the emoji prefix. */
export function metricLabelText(key: string): string {
	const translated = METRIC_LABEL_KEYS[key];
	return translated ? translated() : prettifyKey(key);
}

/** Translated class name with an emoji prefix. */
export function metricLabel(key: string): string {
	return `${metricEmoji(key)} ${metricLabelText(key)}`;
}

/* ── Row normalization + bucketing ────────────────────────────────────── */

export function normalizeTrafficRows(
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

function isWeatherKey(key: string): boolean {
	const normalized = normalizeKey(key);
	if (METADATA_KEYS.has(normalized)) return false;
	return WEATHER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isPriorityTrafficKey(key: string): boolean {
	const normalized = normalizeKey(key);
	return PRIORITY_TRAFFIC_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

/**
 * Detection classes present in the rows, in TRAFFIC_CLASS_KEYS order. Unknown
 * schemas fall back to keyword discovery over numeric columns.
 */
export function resolveTrafficClassKeys(rows: TrafficRow[]): string[] {
	const present = TRAFFIC_CLASS_KEYS.filter((key) =>
		rows.some((row) => readNumber(row[key]) !== null)
	);
	if (present.length > 0) return [...present];

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

export function sumTrafficValues(row: TrafficRow, classKeys: string[]): number {
	if (classKeys.length === 0) {
		return 1;
	}

	return classKeys.reduce((total, key) => total + (readNumber(row[key]) ?? 0), 0);
}

/**
 * The bucket-start instant for a row: `traffic_hour` when present (the true
 * accumulator key), otherwise the created_at hour floor.
 */
export function rowHourStart(row: TrafficRow): Date | null {
	const trafficHour = parseDate(row.traffic_hour);
	if (trafficHour) return trafficHour;

	const createdAt = parseDate(row.created_at);
	return createdAt ? toHourStart(createdAt) : null;
}

export function buildHourlyTrafficRows(
	rows: TrafficRow[],
	classKeys: string[]
): HourlyTrafficRow[] {
	const buckets: Record<string, HourlyTrafficRow> = {};

	for (const row of rows) {
		const hourStart = rowHourStart(row);
		if (!hourStart) continue;

		const hourKey = toHourKey(hourStart);
		let bucket = buckets[hourKey];

		if (!bucket) {
			bucket = {
				id: hourKey,
				traffic_hour: hourStart.toISOString(),
				day_key: toDayKey(hourStart),
				hour_timestamp: hourStart.getTime(),
				total_traffic: 0,
				samples: 0
			};

			for (const key of classKeys) {
				bucket[key] = 0;
			}

			buckets[hourKey] = bucket;
		}

		bucket.samples += 1;
		bucket.total_traffic += sumTrafficValues(row, classKeys);

		for (const key of classKeys) {
			bucket[key] = (readNumber(bucket[key]) ?? 0) + (readNumber(row[key]) ?? 0);
		}
	}

	return Object.values(buckets).sort((left, right) => left.hour_timestamp - right.hour_timestamp);
}

export function buildDailyTrafficSummaries(
	rows: TrafficRow[],
	classKeys: string[]
): DailyTrafficSummary[] {
	type DailyAccumulator = DailyTrafficSummary & { hourKeys: Record<string, true> };

	const dailyTotals: Record<string, DailyAccumulator> = {};

	for (const row of rows) {
		const hourStart = rowHourStart(row);
		if (!hourStart) continue;

		const dayKey = toDayKey(hourStart);
		let daily = dailyTotals[dayKey];
		if (!daily) {
			daily = {
				dayKey,
				date: new Date(hourStart),
				totalTraffic: 0,
				hourCount: 0,
				sampleCount: 0,
				hourKeys: {},
				classTotals: Object.fromEntries(classKeys.map((key) => [key, 0]))
			};
			dailyTotals[dayKey] = daily;
		}

		daily.totalTraffic += sumTrafficValues(row, classKeys);
		daily.sampleCount += 1;
		daily.hourKeys[toHourKey(hourStart)] = true;
		for (const key of classKeys) {
			daily.classTotals[key] = (daily.classTotals[key] ?? 0) + (readNumber(row[key]) ?? 0);
		}
	}

	return Object.values(dailyTotals)
		.sort((left, right) => left.date.getTime() - right.date.getTime())
		.map(({ hourKeys, ...daily }) => ({ ...daily, hourCount: Object.keys(hourKeys).length }));
}

export function computeTrafficKpis(
	hourlyRows: HourlyTrafficRow[],
	classKeys: string[],
	now: Date
): TrafficKpis {
	const todayTotal = hourlyRows.reduce((total, row) => total + row.total_traffic, 0);
	const sampleCount = hourlyRows.reduce((total, row) => total + row.samples, 0);

	const currentHourKey = toHourKey(toHourStart(now));
	const exactCurrent = hourlyRows.find((row) => row.id === currentHourKey) ?? null;
	const currentHourRow = exactCurrent ?? hourlyRows[hourlyRows.length - 1] ?? null;

	let peakHourRow: HourlyTrafficRow | null = null;
	for (const row of hourlyRows) {
		if (!peakHourRow || row.total_traffic > peakHourRow.total_traffic) {
			peakHourRow = row;
		}
	}

	const classTotals: Record<string, number> = Object.fromEntries(
		classKeys.map((key) => [
			key,
			hourlyRows.reduce((total, row) => total + (readNumber(row[key]) ?? 0), 0)
		])
	);

	let topClassKey: string | null = null;
	for (const key of classKeys) {
		if (topClassKey === null || (classTotals[key] ?? 0) > (classTotals[topClassKey] ?? 0)) {
			topClassKey = key;
		}
	}
	if (topClassKey !== null && (classTotals[topClassKey] ?? 0) === 0) {
		topClassKey = null;
	}

	return {
		todayTotal,
		trackedHours: hourlyRows.length,
		sampleCount,
		currentHourRow,
		isCurrentHour: exactCurrent !== null,
		peakHourRow,
		topClassKey,
		classTotals
	};
}
