import type { Snippet } from 'svelte';

export type SortDir = 'asc' | 'desc';
export type FilterFn<T = any> = (item: T, search: string) => boolean;
export type SortFn<T = any> = (a: T, b: T, key: string, dir: SortDir) => number;
export type RowIdFn<T = any> = (item: T, index: number) => string | number | null | undefined;

export type ColumnFilterOption = { value: string; label?: string };
export type ColumnFilter = { type: 'checkbox'; options: ColumnFilterOption[] };

export type BadgeEntry = { label?: string; dotClass?: string; badgeClass?: string };

export type ButtonConfig<T = any> = {
	label: string;
	variant?: 'primary' | 'ghost';
	onClick?: (row: T) => void;
	class?: string;
};

export type SelectOption = { value: string | number; label: string };

export type SelectConfig<T = any> = {
	options: SelectOption[] | ((row: T) => SelectOption[]);
	placeholder?: string;
	onChange?: (row: T, value: string | number | null) => void;
	disabled?: boolean | ((row: T) => boolean);
	size?: 'sm' | 'md' | 'lg';
};

export type ColumnConfig<T = any> = {
	key: string;
	label: string;
	value?: string;
	secondaryKey?: string;
	type?: 'text' | 'number' | 'datetime' | 'stacked' | 'badge' | 'buttons' | 'select' | 'custom';
	href?: string | ((row: T) => string | undefined);
	suffix?: string;
	align?: 'left' | 'center' | 'right';
	sortable?: boolean;
	sortOrder?: string[];
	badges?: Record<string, BadgeEntry>;
	filter?: ColumnFilter;
	width?: string;
	cellClass?: string;
	buttons?: ButtonConfig<T>[];
	select?: SelectConfig<T>;
};

export type CellSnippetPayload = { item: unknown; col: ColumnConfig; value: unknown };
export type CellSnippet = Snippet<[CellSnippetPayload]>;

export type TableContext = {
	sortKey: string;
	sortDir: SortDir;
	search: string;
	page: number;
	pageSize: number;
	pageCount: number;
	total: number;
	useVirtual: boolean;
	visibleStart: number;
	visibleEnd: number;
	startIndex: number;
	hasActions: boolean;
	setSort: (key: string, dir?: SortDir) => void;
	sortIcon: (key: string) => string;
	clearAll: () => void;
	goToPage: (p: number) => void;
	nextPage: () => void;
	prevPage: () => void;
	setPageSize: (s: number) => void;
	setSearch: (s: string) => void;
	toggleVirtual: () => void;
};
