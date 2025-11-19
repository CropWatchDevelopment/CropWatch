import { DateTime } from 'luxon';

const tzOffsetPattern = /([zZ]|[+\-]\d{2}:?\d{2})$/;

/**
 * Normalize device timestamps into the requested timezone. When a timestamp
 * string lacks an explicit offset we treat it as UTC (the format returned by
 * Supabase/Postgres) and then convert it into the provided timezone so the PDF
 * table always displays local times.
 */
export function parseDeviceInstant(input: string | Date, tz: string): DateTime {
	if (input instanceof Date) {
		return DateTime.fromJSDate(input, { zone: 'utc' }).setZone(tz);
	}

	if (typeof input !== 'string') {
		return DateTime.invalid('Unsupported timestamp type');
	}

	if (tzOffsetPattern.test(input)) {
		let dt = DateTime.fromISO(input, { setZone: true });
		if (!dt.isValid) dt = DateTime.fromSQL(input, { setZone: true });
		if (!dt.isValid) dt = DateTime.fromRFC2822(input, { setZone: true });
		return dt.setZone(tz);
	}

	let dt = DateTime.fromISO(input, { zone: 'utc' });
	if (!dt.isValid) dt = DateTime.fromSQL(input, { zone: 'utc' });
	if (!dt.isValid) dt = DateTime.fromRFC2822(input, { zone: 'utc' });
	return dt.setZone(tz);
}
