import type { ColumnConfig, FilterFn, RowIdFn, SortFn, SortDir } from './types';

const FALLBACK_ROW_KEYS = [
	'id',
	'dev_eui',
	'report_id',
	'ruleGroupId',
	'gateway_id',
	'location_id',
	'user_id'
] as const;

export const defaultFilter: FilterFn<unknown> = (item, search) => {
	if (!search.trim()) return true;
	const lowered = search.toLowerCase();
	return JSON.stringify(item ?? '').toLowerCase().includes(lowered);
};

export const defaultSort: SortFn<unknown> = (a, b, key, dir) => {
	const left = (a as Record<string, unknown>)[key];
	const right = (b as Record<string, unknown>)[key];
	const dirMul = dir === 'asc' ? 1 : -1;

	if (typeof left === 'number' && typeof right === 'number') {
		return (left - right) * dirMul;
	}

	return String(left ?? '').localeCompare(String(right ?? '')) * dirMul;
};

export const defaultRowId: RowIdFn<unknown> = (item) => {
	const record = item as Record<string, unknown>;
	for (const key of FALLBACK_ROW_KEYS) {
		const value = record?.[key];
		if (typeof value === 'string' || typeof value === 'number') {
			return `${key}:${String(value)}`;
		}
	}

	return undefined;
};

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const alignClass = (align?: string) => {
	if (align === 'right') return 'text-right';
	if (align === 'center') return 'text-center';
	return 'text-left';
};

export const buttonClasses = (variant?: string) => {
	if (variant === 'ghost') {
		return 'rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800';
	}
	return 'rounded-md bg-sky-500 px-3 py-1 text-[11px] font-medium text-slate-950 shadow-sm transition hover:bg-sky-400';
};

export const toDate = (value: unknown): Date | null => {
	if (!value) return null;
	if (value instanceof Date) {
		return Number.isFinite(value.getTime()) ? value : null;
	}
	if (typeof value === 'string' || typeof value === 'number') {
		const parsed = new Date(value);
		return Number.isFinite(parsed.getTime()) ? parsed : null;
	}
	return null;
};

export const getColumnValue = (item: unknown, col: ColumnConfig) => {
	const record = item as Record<string, unknown>;
	if (col.value) return record[col.value];
	return record[col.key];
};

export const resolveHref = (item: unknown, col: ColumnConfig) => {
	if (!col.href || col.type === 'buttons') return undefined;
	try {
		return typeof col.href === 'function' ? col.href(item) ?? undefined : col.href;
	} catch {
		return undefined;
	}
};

export const sortByColumn = (
	a: unknown,
	b: unknown,
	key: string,
	dir: SortDir,
	columnMap: Record<string, ColumnConfig>,
	sortFn: SortFn<unknown>
) => {
	const col = columnMap[key];
	if (!col) return sortFn(a, b, key, dir);
	const dirMul = dir === 'asc' ? 1 : -1;
	const left = getColumnValue(a, col);
	const right = getColumnValue(b, col);

	const order = col.sortOrder ?? col.filter?.options?.map((o) => o.value);
	if (order) {
		return (order.indexOf(String(left)) - order.indexOf(String(right))) * dirMul;
	}

	if (col.type === 'number') {
		return ((Number(left) || 0) - (Number(right) || 0)) * dirMul;
	}
	if (col.type === 'datetime') {
		const leftTime = toDate(left)?.getTime() ?? 0;
		const rightTime = toDate(right)?.getTime() ?? 0;
		return (leftTime - rightTime) * dirMul;
	}
	if (col.type === 'buttons') {
		return 0;
	}

	return String(left ?? '').localeCompare(String(right ?? '')) * dirMul;
};
