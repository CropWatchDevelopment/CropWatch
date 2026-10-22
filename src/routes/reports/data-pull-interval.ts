import { m } from '$lib/paraglide/messages.js';

export type SelectOption = {
	disabled?: boolean;
	label: string;
	value: string;
};

export const DEFAULT_REPORT_DATA_PULL_INTERVAL = '30';

/** The intervals (in minutes) the form offers: 30 minutes and 1 hour. */
const BASE_REPORT_DATA_PULL_INTERVALS: ReadonlyArray<number> = [30, 60];

function readPositiveInteger(value: unknown): number | undefined {
	if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
		return value;
	}

	if (typeof value !== 'string') {
		return undefined;
	}

	const normalized = value.trim();
	if (!normalized) {
		return undefined;
	}

	const parsed = Number.parseInt(normalized, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function formatIntervalLabel(minutes: number): string {
	if (minutes % 60 === 0) {
		const hours = minutes / 60;
		return hours === 1
			? m.reports_data_pull_interval_hours_one()
			: m.reports_data_pull_interval_hours_other({ count: hours });
	}

	return minutes === 1
		? m.reports_data_pull_interval_minutes_one()
		: m.reports_data_pull_interval_minutes_other({ count: minutes });
}

export function parseReportDataPullInterval(value: unknown): number | undefined {
	return readPositiveInteger(value);
}

export function normalizeReportDataPullInterval(
	value: unknown,
	fallback = DEFAULT_REPORT_DATA_PULL_INTERVAL
): string {
	return String(readPositiveInteger(value) ?? fallback);
}

/**
 * The interval options, labelled in the current language (so built on each
 * call, not at import). A saved interval the form does not offer comes first.
 */
export function buildReportDataPullIntervalOptions(
	currentValue: unknown
): ReadonlyArray<SelectOption> {
	const normalizedValue = readPositiveInteger(currentValue);
	const intervals =
		normalizedValue === undefined || BASE_REPORT_DATA_PULL_INTERVALS.includes(normalizedValue)
			? BASE_REPORT_DATA_PULL_INTERVALS
			: [normalizedValue, ...BASE_REPORT_DATA_PULL_INTERVALS];

	return intervals.map((minutes) => ({
		label: formatIntervalLabel(minutes),
		value: String(minutes)
	}));
}
