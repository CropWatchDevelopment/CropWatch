/**
 * `created_at` normalization. The API stores UTC; every `created_at` key
 * (any casing, any depth) in a response is rewritten to the client's
 * configured UTC offset, and rewritten back to UTC in request bodies.
 */

const CREATED_AT_KEY = 'created_at';
const MINUTES_PER_HOUR = 60;
const MILLISECONDS_PER_MINUTE = 60_000;
const TIMEZONE_SUFFIX_PATTERN = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function padDatePart(value: number, size = 2): string {
	return String(value).padStart(size, '0');
}

/** A timestamp without a zone suffix is UTC; a bare date is UTC midnight. */
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

function parseUtcTimestamp(value: string): Date | null {
	const parsed = new Date(normalizeTimestampInput(value));
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatOffset(offsetMinutes: number): string {
	const sign = offsetMinutes >= 0 ? '+' : '-';
	const absoluteMinutes = Math.abs(offsetMinutes);
	const hours = Math.floor(absoluteMinutes / MINUTES_PER_HOUR);
	const minutes = absoluteMinutes % MINUTES_PER_HOUR;
	return `${sign}${padDatePart(hours)}:${padDatePart(minutes)}`;
}

function formatTimestampForOffset(date: Date, offsetHours: number): string {
	const offsetMinutes = Math.round(offsetHours * MINUTES_PER_HOUR);
	const shiftedDate = new Date(date.getTime() + offsetMinutes * MILLISECONDS_PER_MINUTE);

	return [
		`${shiftedDate.getUTCFullYear()}-${padDatePart(shiftedDate.getUTCMonth() + 1)}-${padDatePart(shiftedDate.getUTCDate())}`,
		`${padDatePart(shiftedDate.getUTCHours())}:${padDatePart(shiftedDate.getUTCMinutes())}:${padDatePart(shiftedDate.getUTCSeconds())}.${padDatePart(shiftedDate.getUTCMilliseconds(), 3)}${formatOffset(offsetMinutes)}`
	].join('T');
}

/** Unparseable values pass through unchanged. */
export function toTimeZoneOffsetTimestamp(value: string, offsetHours: number): string {
	const parsed = parseUtcTimestamp(value);
	return parsed ? formatTimestampForOffset(parsed, offsetHours) : value;
}

/** Unparseable values pass through unchanged. */
export function toUtcTimestamp(value: string): string {
	const parsed = parseUtcTimestamp(value);
	return parsed ? parsed.toISOString() : value;
}

export function mapCreatedAtFields(value: unknown, mapper: (createdAt: string) => string): unknown {
	if (Array.isArray(value)) {
		return value.map((entry) => mapCreatedAtFields(entry, mapper));
	}

	if (!isRecord(value)) {
		return value;
	}

	return Object.fromEntries(
		Object.entries(value).map(([key, entryValue]) => {
			if (key.toLowerCase() === CREATED_AT_KEY) {
				if (entryValue instanceof Date) {
					return [key, mapper(entryValue.toISOString())];
				}
				return [key, typeof entryValue === 'string' ? mapper(entryValue) : entryValue];
			}

			return [key, mapCreatedAtFields(entryValue, mapper)];
		})
	);
}
