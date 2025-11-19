import { DateTime } from 'luxon';

const tzOffsetPattern = /([zZ]|[+\-]\d{2}:?\d{2})$/;

export const timestampHasExplicitOffset = (value: string): boolean =>
	tzOffsetPattern.test(value.trim());

/**
 * Normalize device timestamps into the requested timezone. Strings without an
 * explicit offset are assumed to be stored in UTC (Postgres default) and are
 * therefore converted from UTC into the caller's timezone so that report data
 * always represents the user's day (JST, etc.) regardless of where the server
 * runs.
 */
export function parseDeviceInstant(input: string | Date, tz: string): DateTime {
	if (input instanceof Date) {
		return DateTime.fromJSDate(input, { zone: 'utc' }).setZone(tz);
	}

	if (typeof input !== 'string') {
		return DateTime.invalid('Unsupported timestamp type');
	}

	const value = input.trim();
	if (!value) {
		return DateTime.invalid('Empty timestamp');
	}

	if (timestampHasExplicitOffset(value)) {
		let dt = DateTime.fromISO(value, { setZone: true });
		if (!dt.isValid) dt = DateTime.fromSQL(value, { setZone: true });
		if (!dt.isValid) dt = DateTime.fromRFC2822(value, { setZone: true });
		return dt.setZone(tz);
	}

	let dt = DateTime.fromISO(value, { zone: 'utc' });
	if (!dt.isValid) dt = DateTime.fromSQL(value, { zone: 'utc' });
	if (!dt.isValid) dt = DateTime.fromRFC2822(value, { zone: 'utc' });
	return dt.setZone(tz);
}
