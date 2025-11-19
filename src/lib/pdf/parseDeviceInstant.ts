import { DateTime } from 'luxon';

const tzOffsetPattern = /([zZ]|[+\-]\d{2}:?\d{2})$/;

export const timestampHasExplicitOffset = (value: string): boolean =>
	tzOffsetPattern.test(value.trim());

/**
 * Normalize device timestamps into the requested timezone. When a timestamp
 * string lacks an explicit offset we treat it as already representing the
 * user's chosen timezone and simply attach that zone so the rendering is
 * independent of the host machine's locale (critical on Vercel where the
 * runtime is UTC).
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

	let dt = DateTime.fromISO(value, { zone: tz });
	if (!dt.isValid) dt = DateTime.fromSQL(value, { zone: tz });
	if (!dt.isValid) dt = DateTime.fromRFC2822(value, { zone: tz });
	return dt.setZone(tz);
}
