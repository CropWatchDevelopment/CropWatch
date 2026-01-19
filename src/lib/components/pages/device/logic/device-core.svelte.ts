import { SvelteMap } from 'svelte/reactivity';
import type { TrafficRow } from '$lib/components/traffic/traffic.types';

export type HistoryMeta = {
	table?: string | null;
	primaryKey?: string | null;
	secondaryKey?: string | null;
};

export type SensorMode = 'air' | 'soil';

export type HistoryPoint = {
	timestamp?: string | null;
	primary?: number | null;
	secondary?: number | null;
	co2?: number | null;
	ec?: number | null;
	raw?: Record<string, unknown>;
};

export type TelemetryEntry = {
	timestamp: string;
	temperature: number;
	humidity?: number;
	moisture?: number;
	co2?: number | null;
	ec?: number | null;
	alert: boolean;
};

export const getSensorMode = (table?: string | null): SensorMode =>
	table === 'cw_soil_data' ? 'soil' : 'air';

export const toNumber = (value: unknown, fallback = 0) => {
	const numeric = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(numeric) ? numeric : fallback;
};

export const toOptionalNumber = (value: unknown) => {
	const numeric = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(numeric) ? numeric : null;
};

export const mapHistoryEntry = (point: HistoryPoint, mode: SensorMode): TelemetryEntry => {
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

export const mapHistory = (points: HistoryPoint[], mode: SensorMode) =>
	points.map((point) => mapHistoryEntry(point, mode));

export const TRAFFIC_TIME_ZONE = 'Asia/Tokyo';

export const trafficDateFormatterTZ = new Intl.DateTimeFormat('en-CA', {
	timeZone: TRAFFIC_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

export const trafficDateTimeFormatterTZ = new Intl.DateTimeFormat('en-CA', {
	timeZone: TRAFFIC_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	second: '2-digit',
	hour12: false
});

const getMonthPartsTZ = (date: Date) => {
	const parts = trafficDateFormatterTZ.formatToParts(date);
	const year = Number(parts.find((p) => p.type === 'year')?.value ?? '1970');
	const monthIndex = Number(parts.find((p) => p.type === 'month')?.value ?? '01') - 1;
	return { year, monthIndex };
};

const zonedDateToUtc = (
	year: number,
	monthIndex: number,
	day: number,
	hour: number,
	minute: number,
	second: number
) => {
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
};

export const getTokyoMonthBounds = (date: Date) => {
	const { year, monthIndex } = getMonthPartsTZ(date);
	const start = zonedDateToUtc(year, monthIndex, 1, 0, 0, 0);
	const endDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	const end = zonedDateToUtc(year, monthIndex, endDay, 23, 59, 59);
	return { start, end };
};

export const formatDateTZ = (date: Date) => {
	const parts = trafficDateFormatterTZ.formatToParts(date);
	const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
	const month = parts.find((p) => p.type === 'month')?.value ?? '01';
	const day = parts.find((p) => p.type === 'day')?.value ?? '01';
	return `${year}-${month}-${day}`;
};

export const formatDateTimeTZ = (date: Date) => {
	const parts = trafficDateTimeFormatterTZ.formatToParts(date);
	const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
	const month = parts.find((p) => p.type === 'month')?.value ?? '01';
	const day = parts.find((p) => p.type === 'day')?.value ?? '01';
	const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
	const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
	const second = parts.find((p) => p.type === 'second')?.value ?? '00';
	return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
};

export const getLocalHourStartUtc = (date: Date) => {
	const parts = trafficDateTimeFormatterTZ.formatToParts(date);
	const year = Number(parts.find((p) => p.type === 'year')?.value ?? '1970');
	const monthIndex = Number(parts.find((p) => p.type === 'month')?.value ?? '01') - 1;
	const day = Number(parts.find((p) => p.type === 'day')?.value ?? '01');
	const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '00');
	return zonedDateToUtc(year, monthIndex, day, hour, 0, 0);
};

const csvEscape = (value: string) => {
	if (value.includes('"') || value.includes(',') || value.includes('\n')) {
		return `"${value.replace(/\"/g, '""')}"`;
	}
	return value;
};

export const buildTrafficCsv = (rows: TrafficRow[], rangeStart: Date, rangeEnd: Date) => {
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
};

export const downloadCsv = (contents: string, filename: string) => {
	const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = filename;
	link.click();
	URL.revokeObjectURL(link.href);
};
