import type { SelectOption } from './report-form.types';

export const DEFAULT_REPORT_DATA_PULL_INTERVAL = '30';

const BASE_REPORT_DATA_PULL_INTERVAL_OPTIONS: ReadonlyArray<SelectOption> = Object.freeze([
	{ label: '30 minutes', value: '30' },
	{ label: '1 hour', value: '60' }
]);

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
		return hours === 1 ? '1 hour' : `${hours} hours`;
	}

	return `${minutes} minutes`;
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

export function buildReportDataPullIntervalOptions(
	currentValue: unknown
): ReadonlyArray<SelectOption> {
	const normalizedValue = readPositiveInteger(currentValue);

	if (
		normalizedValue === undefined ||
		BASE_REPORT_DATA_PULL_INTERVAL_OPTIONS.some(
			(option) => option.value === String(normalizedValue)
		)
	) {
		return BASE_REPORT_DATA_PULL_INTERVAL_OPTIONS;
	}

	return [
		{
			label: formatIntervalLabel(normalizedValue),
			value: String(normalizedValue)
		},
		...BASE_REPORT_DATA_PULL_INTERVAL_OPTIONS
	];
}
