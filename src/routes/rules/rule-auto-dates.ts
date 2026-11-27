import type { CwDateValue } from '@cropwatchdevelopment/cwui';

/**
 * The instant a date-and-time picker value stands for (ISO 8601, UTC), or
 * null when nothing is picked. The picker works in the browser's time zone,
 * so this is where "9:00 here" becomes one moment for everyone.
 */
export function toInstant(value: CwDateValue | undefined): string | null {
	if (!value || !('date' in value) || Number.isNaN(value.date.getTime())) return null;
	const local = new Date(value.date);
	local.setHours(value.time?.hours ?? 0, value.time?.minutes ?? 0, 0, 0);
	return local.toISOString();
}

/** The picker value for a stored instant, in the browser's time zone (to the minute). */
export function fromInstant(instant: string | null | undefined): CwDateValue | undefined {
	if (!instant) return undefined;
	const date = new Date(instant);
	if (Number.isNaN(date.getTime())) return undefined;
	return {
		date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
		time: { hours: date.getHours(), minutes: date.getMinutes() }
	};
}

export function sameInstant(a: string | null, b: string | null): boolean {
	if (a === null || b === null) return a === b;
	return Date.parse(a) === Date.parse(b);
}

/** The IANA name of the browser's time zone, e.g. "Asia/Tokyo". */
export function browserTimeZone(): string {
	return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
