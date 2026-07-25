export type SortDirection = 'asc' | 'desc';

export interface SortByColumnOptions {
	/**
	 * Treat null/undefined cells as the largest value (last in ascending order)
	 * instead of coercing them to `''` for the string comparison.
	 */
	nullsLast?: boolean;
	/** Columns whose values are compared with `Number()` regardless of runtime type. */
	numericColumns?: readonly string[];
	/** Options for the string comparison (e.g. `{ numeric: true, sensitivity: 'base' }`). */
	collator?: Intl.CollatorOptions;
}

/**
 * Generic column comparator for in-memory table rows: numbers (and booleans)
 * compare numerically, everything else falls back to a locale-aware string
 * comparison. Returns a new sorted array; the input is not mutated.
 */
export function sortByColumn<T>(
	rows: readonly T[],
	column: string,
	direction: SortDirection,
	options?: SortByColumnOptions
): T[] {
	const dir = direction === 'asc' ? 1 : -1;

	return [...rows].sort((a, b) => {
		const left = (a as unknown as Record<string, unknown>)[column];
		const right = (b as unknown as Record<string, unknown>)[column];

		if (options?.nullsLast) {
			if (left == null && right == null) return 0;
			if (left == null) return dir;
			if (right == null) return -dir;
		}

		if (options?.numericColumns?.includes(column)) {
			return (Number(left) - Number(right)) * dir;
		}

		if (typeof left === 'boolean' && typeof right === 'boolean') {
			return (Number(left) - Number(right)) * dir;
		}

		if (typeof left === 'number' && typeof right === 'number') {
			return (left - right) * dir;
		}

		return (
			String(left ?? '').localeCompare(String(right ?? ''), undefined, options?.collator) * dir
		);
	});
}
