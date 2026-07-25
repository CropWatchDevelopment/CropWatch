/**
 * Report PDFs live in the `Reports` storage bucket as
 * `<dev_eui>/<YYYY_MM_DD>-<YYYY_MM_DD>.pdf` — the object name is the only
 * place the report's period exists (there is no report table). Regenerated
 * copies append `_updated_<timestamp>` before the extension.
 */
const REPORT_OBJECT_NAME_PATTERN =
	/^(\d{4})_(\d{2})_(\d{2})-(\d{4})_(\d{2})_(\d{2})(_updated_.+)?\.pdf$/;

/**
 * Sensor data is retained for 24 months, and a queued regeneration waits for
 * the next scheduled cron run (up to a month) — so note editing is cut off
 * once a report's period ends more than 23 months ago. The API enforces the
 * same cutoff server-side.
 */
export const REPORT_EDIT_RETENTION_MONTHS = 23;

export interface ReportPeriod {
	/** Period start date, `YYYY-MM-DD`. */
	start: string;
	/** Period end date, `YYYY-MM-DD`. */
	end: string;
	/** True when the object is itself a regenerated (`_updated_`) copy. */
	isUpdated: boolean;
}

/**
 * Parses a report storage object name into its period. Returns null for
 * legacy or unrecognized names (Edit is disabled for those).
 */
export function parseReportPeriod(name: string): ReportPeriod | null {
	const match = REPORT_OBJECT_NAME_PATTERN.exec(name.trim());
	if (!match) return null;

	const [, startYear, startMonth, startDay, endYear, endMonth, endDay, updatedSuffix] = match;
	const start = `${startYear}-${startMonth}-${startDay}`;
	const end = `${endYear}-${endMonth}-${endDay}`;
	if (Number.isNaN(Date.parse(start)) || Number.isNaN(Date.parse(end))) return null;
	if (end < start) return null;

	return { start, end, isUpdated: updatedSuffix !== undefined };
}

/**
 * Whether a report period (its `end` date, `YYYY-MM-DD`) is still within the
 * 23-month note-editing window.
 */
export function isReportPeriodEditable(end: string, now: Date = new Date()): boolean {
	const endDate = new Date(`${end}T23:59:59.999Z`);
	if (Number.isNaN(endDate.getTime())) return false;
	const cutoff = new Date(now);
	cutoff.setMonth(cutoff.getMonth() - REPORT_EDIT_RETENTION_MONTHS);
	return endDate >= cutoff;
}
