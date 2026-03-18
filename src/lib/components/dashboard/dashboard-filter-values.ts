const DASHBOARD_FILTER_VALUE_KEYS = [
	'group',
	'location_group',
	'locationGroup',
	'name',
	'value',
	'label'
] as const;

function toTrimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

export function readDashboardFilterValue(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim();
	}

	if (!value || typeof value !== 'object') {
		return '';
	}

	const record = value as Record<string, unknown>;
	for (const key of DASHBOARD_FILTER_VALUE_KEYS) {
		const candidate = toTrimmedString(record[key]);
		if (candidate) {
			return candidate;
		}
	}

	return '';
}

export function normalizeDashboardFilterValues(
	values: readonly unknown[] | null | undefined
): string[] {
	if (!Array.isArray(values)) {
		return [];
	}

	const normalizedValues = values
		.map((value) => readDashboardFilterValue(value))
		.filter((value) => value.length > 0);

	return Array.from(new Set(normalizedValues)).sort((left, right) =>
		left.localeCompare(right)
	);
}
