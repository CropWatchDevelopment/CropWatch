export type CsvRow = Record<string, unknown>;

export interface CsvExportRangeSelection {
	start: Date;
	end: Date;
	startTime?: {
		hours: number;
		minutes: number;
	};
	endTime?: {
		hours: number;
		minutes: number;
	};
}

interface DownloadCsvOptions {
	locationName: string;
	devEui: string;
	rangeLabel: string;
	timeZone?: string;
}

const CREATED_AT_KEY = 'created_at';
const TIMESTAMP_COLUMN_NAMES = new Set(['created_at', 'timestamp', 'traffic_hour']);
const CSV_ALLOWED_COLUMNS = [CREATED_AT_KEY, 'co2', 'humidity', 'temperature_c', 'moisture', 'ec', 'traffic_day', 'total_people', 'total_bicycles', 'total_vehicles'];
const MILLISECONDS_PER_MINUTE = 60_000;
const TIMEZONE_SUFFIX_PATTERN = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;

export function downloadCsv(rows: CsvRow[], options: DownloadCsvOptions): void {
	if (rows.length === 0) {
		return;
	}

	const columns = getColumns(rows);
	const records = rows.map((row) =>
		columns.map((column) => escapeCsvValue(formatCsvValue(column, row[column], options.timeZone)))
	);
	const csv = [columns.join(','), ...records.map((record) => record.join(','))].join('\n');

	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	const safeLocationName = sanitizeFileName(options.locationName);
	const safeDevEui = sanitizeFileName(options.devEui);

	link.href = url;
	link.download = `${safeLocationName}-${safeDevEui}-${options.rangeLabel}-data.csv`;
	document.body.append(link);
	link.click();
	link.remove();

	URL.revokeObjectURL(url);
}

export function resolveExportTimeZone(value: unknown): string {
	const resolved =
		readTimeZone(value) ??
		readTimeZone(readRecord(value)?.cw_locations) ??
		readTimeZone(readRecord(value)?.location) ??
		readBrowserTimeZone();

	if (resolved && isValidTimeZone(resolved)) {
		return resolved;
	}

	const browserTimeZone = readBrowserTimeZone();
	return browserTimeZone && isValidTimeZone(browserTimeZone) ? browserTimeZone : 'UTC';
}

export function resolveCsvRequestRange(
	selection: CsvExportRangeSelection,
	timeZone: string
): { start: string; end: string } {
	const startDate = zonedDateTimeToUtc(
		selection.start,
		selection.startTime?.hours ?? 0,
		selection.startTime?.minutes ?? 0,
		0,
		0,
		timeZone
	);
	const endDate = zonedDateTimeToUtc(
		selection.end,
		selection.endTime?.hours ?? 23,
		selection.endTime?.minutes ?? 59,
		59,
		999,
		timeZone
	);

	return {
		start: startDate.toISOString(),
		end: endDate.toISOString()
	};
}

export function formatCsvRangeLabel(
	range: { start: Date | string; end: Date | string },
	timeZone: string
): string {
	const startDate = normalizeDate(range.start);
	const endDate = normalizeDate(range.end);
	const safeTimeZone = sanitizeFileName(timeZone.replaceAll('/', '-'));

	if (!startDate || !endDate) {
		return safeTimeZone || 'custom';
	}

	return `${formatFileDateTime(startDate, timeZone)}_to_${formatFileDateTime(endDate, timeZone)}_${safeTimeZone}`;
}

export function formatTimestampForTimeZone(value: string, timeZone: string): string {
	const parsed = parseTimestamp(value);
	if (!parsed) {
		return value;
	}

	return formatDateForTimeZone(parsed, timeZone);
}

function escapeCsvValue(value: string | number): string {
	const normalized = String(value);
	if (/[,"\n]/.test(normalized)) {
		return `"${normalized.replace(/"/g, '""')}"`;
	}
	return normalized;
}

function formatCsvValue(column: string, value: unknown, timeZone?: string): string | number {
	if (value == null) {
		return '';
	}

	if (value instanceof Date) {
		return timeZone ? formatDateForTimeZone(value, timeZone) : value.toISOString();
	}

	if (typeof value === 'string' && timeZone && isTimestampColumn(column)) {
		return formatTimestampForTimeZone(value, timeZone);
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return typeof value === 'number' ? value : String(value);
}

function getColumns(rows: CsvRow[]): string[] {
	const keys = new Set<string>();

	for (const row of rows) {
		for (const key of Object.keys(row)) {
			keys.add(key);
		}
	}

	return CSV_ALLOWED_COLUMNS.filter((col) => keys.has(col));
}

function sanitizeFileName(value: string): string {
	const normalized = value.trim();
	return normalized.length > 0 ? normalized.replace(/[^a-zA-Z0-9_-]/g, '_') : 'device';
}

function readRecord(value: unknown): Record<string, unknown> | null {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readTimeZone(value: unknown): string | null {
	if (Array.isArray(value)) {
		for (const entry of value) {
			const nestedTimeZone = readTimeZone(entry);
			if (nestedTimeZone) {
				return nestedTimeZone;
			}
		}

		return null;
	}

	const record = readRecord(value);
	if (!record) {
		return null;
	}

	return (
		readString(record.timezone) ??
		readString(record.time_zone) ??
		readString(record.iana_timezone) ??
		readString(record.ianaTimeZone) ??
		null
	);
}

function readBrowserTimeZone(): string | null {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
	} catch {
		return null;
	}
}

function isValidTimeZone(timeZone: string): boolean {
	try {
		new Intl.DateTimeFormat('en-US', { timeZone }).format(new Date());
		return true;
	} catch {
		return false;
	}
}

function isTimestampColumn(column: string): boolean {
	const normalized = column.toLowerCase();
	return (
		TIMESTAMP_COLUMN_NAMES.has(normalized) ||
		normalized === CREATED_AT_KEY ||
		normalized.endsWith('_at') ||
		normalized.endsWith('_time')
	);
}

function normalizeDate(value: Date | string): Date | null {
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	return parseTimestamp(value);
}

function padDatePart(value: number, size = 2): string {
	return String(value).padStart(size, '0');
}

function normalizeTimestampInput(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;
	if (TIMEZONE_SUFFIX_PATTERN.test(trimmed)) return trimmed;

	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		return `${trimmed}T00:00:00.000Z`;
	}

	const normalized = trimmed.includes('T') ? trimmed : trimmed.replace(' ', 'T');
	return `${normalized}Z`;
}

function parseTimestamp(value: string): Date | null {
	const parsed = new Date(normalizeTimestampInput(value));
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getTimeZoneOffsetMilliseconds(date: Date, timeZone: string): number {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	});
	const parts = formatter.formatToParts(date);
	const values = Object.fromEntries(
		parts
			.filter((part) => part.type !== 'literal')
			.map((part) => [part.type, Number.parseInt(part.value, 10)])
	);
	const asUtc = Date.UTC(
		values.year,
		values.month - 1,
		values.day,
		values.hour,
		values.minute,
		values.second,
		date.getUTCMilliseconds()
	);

	return asUtc - date.getTime();
}


function formatDateForTimeZone(date: Date, timeZone: string): string {
	const offsetMinutes = Math.round(
		getTimeZoneOffsetMilliseconds(date, timeZone) / MILLISECONDS_PER_MINUTE
	);
	const shiftedDate = new Date(date.getTime() + offsetMinutes * MILLISECONDS_PER_MINUTE);

	const datePart = `${shiftedDate.getUTCFullYear()}-${padDatePart(shiftedDate.getUTCMonth() + 1)}-${padDatePart(shiftedDate.getUTCDate())}`;
	const timePart = `${padDatePart(shiftedDate.getUTCHours())}:${padDatePart(shiftedDate.getUTCMinutes())}:${padDatePart(shiftedDate.getUTCSeconds())}`;
	return `${datePart} ${timePart}`;
}

function formatFileDateTime(date: Date, timeZone: string): string {
	const formatter = new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23'
	});
	const parts = formatter.formatToParts(date);
	const values = Object.fromEntries(
		parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value])
	);

	return `${values.year}${values.month}${values.day}-${values.hour}${values.minute}`;
}

function zonedDateTimeToUtc(
	date: Date,
	hours: number,
	minutes: number,
	seconds: number,
	milliseconds: number,
	timeZone: string
): Date {
	const year = date.getFullYear();
	const month = date.getMonth();
	const day = date.getDate();
	const utcGuess = Date.UTC(year, month, day, hours, minutes, seconds, milliseconds);
	let offset = getTimeZoneOffsetMilliseconds(new Date(utcGuess), timeZone);
	let resolvedTime = utcGuess - offset;
	const adjustedOffset = getTimeZoneOffsetMilliseconds(new Date(resolvedTime), timeZone);

	if (adjustedOffset !== offset) {
		offset = adjustedOffset;
		resolvedTime = utcGuess - offset;
	}

	return new Date(resolvedTime);
}
