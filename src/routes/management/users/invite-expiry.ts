/**
 * A guest's access ends at the end of the day the inviter picks, in the
 * inviter's own time zone. Only the browser knows that zone, so it turns the
 * day into an instant ({@link endOfDayInstant}) and the invite action only
 * checks the instant it receives ({@link readIsoInstant}).
 */

/**
 * The end of `day` (`YYYY-MM-DD`) in the browser's time zone, as an ISO
 * instant; `''` when `day` is not a calendar date.
 */
export function endOfDayInstant(day: string): string {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day.trim());
	if (!match) return '';
	const [year, month, date] = match.slice(1).map(Number);
	const end = new Date(year, month - 1, date, 23, 59, 59);
	// A day that does not exist (2026-02-30) would roll over into the next month.
	const exists =
		end.getFullYear() === year && end.getMonth() === month - 1 && end.getDate() === date;
	return exists ? end.toISOString() : '';
}

/** `value` when it is an ISO instant as `Date#toISOString()` writes it, else `null`. */
export function readIsoInstant(value: string): string | null {
	const time = Date.parse(value);
	return Number.isFinite(time) && new Date(time).toISOString() === value ? value : null;
}
