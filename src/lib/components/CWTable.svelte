<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import './cw-table/styles.css';
	import TableBody from './cw-table/TableBody.svelte';
	import TableFooter from './cw-table/TableFooter.svelte';
	import TableHeader from './cw-table/TableHeader.svelte';
	import TableToolbar from './cw-table/TableToolbar.svelte';
	import { clamp, defaultFilter, defaultRowId, defaultSort, sortByColumn } from './cw-table/helpers';
	import type {
		BadgeEntry,
		ButtonConfig,
		CellSnippet,
		ColumnConfig,
		FilterFn,
		RowIdFn,
		SelectConfig,
		SelectOption,
		SortDir,
		SortFn,
		TableContext
	} from './cw-table/types';

	export type { BadgeEntry, ButtonConfig, ColumnConfig, SelectConfig, SelectOption, TableContext };

	type PersistedTableState = {
		sortKey?: string;
		sortDir?: SortDir;
		filters?: Record<string, string[]>;
	};

	let {
		items = [],
		columns = [],
		storageKey = null,
		filterFn = defaultFilter,
		sortFn = defaultSort,
		getRowId = defaultRowId,
		rowHeight = 52,
		rowMaxHeight = 64,
		viewportHeight = 0,
		header = undefined,
		row = undefined,
		cell = undefined,
		actions = undefined,
		empty = undefined,
		pageSize = $bindable(15),
		page = $bindable(1),
		search = $bindable(''),
		sortKey = $bindable(''),
		sortDir = $bindable<SortDir>('asc'),
		virtual = $bindable(false),
		class: className = 'text-sm text-slate-100',
		loading = false,
		loadingText = 'Loading...'
	}: {
		items?: unknown[];
		columns?: ColumnConfig[];
		storageKey?: string | null;
		filterFn?: FilterFn<unknown>;
		sortFn?: SortFn<unknown>;
		getRowId?: RowIdFn<unknown>;
		rowHeight?: number;
		rowMaxHeight?: number;
		viewportHeight?: number;
		header?: Snippet<[TableContext]>;
		row?: Snippet<[unknown, number, TableContext]>;
		cell?: CellSnippet;
		actions?: Snippet<[unknown, number, TableContext]>;
		empty?: Snippet;
		pageSize?: number;
		page?: number;
		search?: string;
		sortKey?: string;
		sortDir?: SortDir;
		virtual?: boolean;
		class?: string;
		loading?: boolean;
		loadingText?: string;
	} = $props();

	rowHeight = Math.min(rowHeight, rowMaxHeight);

	const cloneFilters = (source: Record<string, string[]>) => {
		const next: Record<string, string[]> = {};
		for (const key of Object.keys(source)) {
			next[key] = [...source[key]];
		}
		return next;
	};

	const buildDefaultFilters = () => {
		const defaults: Record<string, string[]> = {};
		for (const col of columns) {
			if (col.filter?.type === 'checkbox') {
				defaults[col.key] = col.filter.options.map((option) => option.value);
			}
		}
		return defaults;
	};

	const sameSelection = (left: string[] = [], right: string[] = []) => {
		if (left.length !== right.length) return false;
		for (const value of left) {
			if (!right.includes(value)) return false;
		}
		return true;
	};

	const defaultFilters = $derived.by(() => buildDefaultFilters());

	const columnMap = $derived.by(() => {
		const map: Record<string, ColumnConfig> = {};
		for (const col of columns) map[col.key] = col;
		return map;
	});

	let columnFilters = $state<Record<string, string[]>>(buildDefaultFilters());
	let pendingColumnFilters = $state<Record<string, string[]>>(cloneFilters(buildDefaultFilters()));
	let pendingSortKey = $state<string>(sortKey || (columns[0]?.key ?? ''));
	let pendingSortDir = $state<SortDir>(sortDir as SortDir);
	let openColumn = $state<string | null>(null);

	let scrollTop = $state(0);
	let scroller: HTMLDivElement | null = null;
	let containerHeight = $state(viewportHeight);
	let isMobile = $state(false);

	const objectRowIds = new WeakMap<object, string>();
	let generatedRowId = 0;

	const restoreStateFromStorage = (): PersistedTableState | null => {
		if (!storageKey || typeof localStorage === 'undefined') return null;
		const raw = localStorage.getItem(storageKey);
		if (!raw) return null;

		try {
			return JSON.parse(raw) as PersistedTableState;
		} catch (err) {
			console.warn('Failed to read table state', err);
			return null;
		}
	};

	const applyStoredState = (state: PersistedTableState | null) => {
		if (!state) return;
		if (state.sortKey) sortKey = state.sortKey;
		if (state.sortDir) sortDir = state.sortDir;

		const defaults = buildDefaultFilters();
		if (!state.filters) {
			columnFilters = defaults;
			pendingColumnFilters = cloneFilters(defaults);
			return;
		}

		const merged: Record<string, string[]> = { ...defaults };
		for (const col of columns) {
			const saved = state.filters[col.key];
			const fallback = defaults[col.key] ?? [];
			merged[col.key] = saved && saved.length > 0 ? [...saved] : fallback;
		}
		columnFilters = merged;
		pendingColumnFilters = cloneFilters(merged);
	};

	if (typeof window !== 'undefined') {
		applyStoredState(restoreStateFromStorage());
	}

	const saveToStorage = () => {
		if (!storageKey || typeof localStorage === 'undefined') return;
		const payload = JSON.stringify({
			sortKey,
			sortDir,
			filters: columnFilters
		});
		localStorage.setItem(storageKey, payload);
	};

	onMount(() => {
		if (!sortKey && columns.length) {
			sortKey = columns[0].key;
		}

		const mq = window.matchMedia('(max-width: 640px)');
		const updateMobile = () => (isMobile = mq.matches);
		updateMobile();
		mq.addEventListener('change', updateMobile);

		return () => mq.removeEventListener('change', updateMobile);
	});

	const applyColumnFilters = (list: unknown[]) => {
		return list.filter((item) => {
			for (const col of columns) {
				const active = columnFilters[col.key];
				if (col.filter?.type === 'checkbox' && active?.length) {
					const record = item as Record<string, unknown>;
					const value = String(col.value ? record[col.value] : record[col.key] ?? '');
					if (!active.includes(value)) return false;
				}
			}
			return true;
		});
	};

	const tableItems = $derived(Array.isArray(items) ? items : []);

	const filtered = $derived.by(() => {
		const searched = tableItems.filter((item) => filterFn(item, search));
		return applyColumnFilters(searched);
	});

	const sorted = $derived.by(() => {
		if (!sortKey) return [...filtered];
		return [...filtered].sort((a, b) => sortByColumn(a, b, sortKey, sortDir as SortDir, columnMap, sortFn));
	});

	const total = $derived(sorted.length);
	const pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));

	$effect(() => {
		if (virtual) return;
		if (page < 1) page = 1;
		if (page > pageCount) page = pageCount;
	});

	const paginated = $derived.by(() => {
		if (virtual) return sorted;
		const start = (page - 1) * pageSize;
		return sorted.slice(start, start + pageSize);
	});

	const startIndex = $derived(virtual ? Math.max(0, Math.floor(scrollTop / rowHeight)) : 0);
	const visibleCount = $derived(virtual ? Math.ceil(containerHeight / rowHeight) + 2 : pageSize);

	const visibleRows = $derived.by(() => {
		if (!virtual) return paginated;
		const end = Math.min(sorted.length, startIndex + visibleCount);
		return sorted.slice(startIndex, end);
	});

	const topSpacer = $derived(virtual ? startIndex * rowHeight : 0);
	const bottomSpacer = $derived(
		virtual
			? Math.max(sorted.length * rowHeight - topSpacer - visibleRows.length * rowHeight, 0)
			: 0
	);

	const rowsToRender = $derived(virtual ? visibleRows : paginated);
	const rowBaseIndex = $derived(virtual ? startIndex : (page - 1) * pageSize);

	const handleScroll = () => {
		if (!scroller) return;
		scrollTop = scroller.scrollTop;
	};

	const setScrollerRef = (node: HTMLDivElement) => {
		scroller = node;
		return () => {
			if (scroller === node) scroller = null;
		};
	};

	const setSort = (key: string, dir?: SortDir) => {
		if (dir) {
			sortKey = key;
			sortDir = dir;
			saveToStorage();
			return;
		}

		if (key === sortKey) {
			sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		} else {
			sortKey = key;
			sortDir = 'asc';
		}
		saveToStorage();
	};

	const sortIcon = (key: string) => {
		if (key !== sortKey) return '';
		return sortDir === 'asc' ? '↑' : '↓';
	};

	const goToPage = (next: number) => {
		if (virtual) return;
		page = clamp(next, 1, pageCount);
	};

	const nextPage = () => goToPage(page + 1);
	const prevPage = () => goToPage(page - 1);

	const setPageSize = (size: number) => {
		if (size < 1) return;
		pageSize = size;
		if (!virtual) page = 1;
	};

	const toggleVirtual = () => {
		virtual = !virtual;
		if (virtual && scroller) scroller.scrollTop = 0;
	};

	const clearAll = () => {
		search = '';
		sortKey = '';
		sortDir = 'asc';
		columnFilters = buildDefaultFilters();
		pendingColumnFilters = cloneFilters(columnFilters);
		pendingSortKey = columns[0]?.key ?? '';
		pendingSortDir = 'asc';
		page = 1;
		openColumn = null;
		saveToStorage();
	};

	const columnHasFilter = (colKey: string) => {
		const active = columnFilters[colKey] ?? [];
		const baseline = defaultFilters[colKey] ?? [];
		return !sameSelection(active, baseline);
	};

	const hasActiveFilters = $derived.by(() => {
		for (const key of Object.keys(defaultFilters)) {
			const active = columnFilters[key] ?? [];
			if (!sameSelection(active, defaultFilters[key])) return true;
		}
		return Boolean(search);
	});

	const setSearch = (value: string) => {
		search = value;
		if (virtual && scroller) scroller.scrollTop = 0;
	};

	$effect(() => {
		if (isMobile && virtual) {
			virtual = false;
		}
	});

	$effect(() => {
		rowsToRender;
		if (virtual && scroller && scrollTop > scroller.scrollHeight) {
			scroller.scrollTop = 0;
		}
	});

	const visibleStart = $derived(
		virtual ? Math.min(total, startIndex + 1) : Math.min(total, (page - 1) * pageSize + 1)
	);
	const visibleEnd = $derived(
		virtual
			? Math.min(total, startIndex + rowsToRender.length)
			: Math.min(total, (page - 1) * pageSize + paginated.length)
	);

	const tableContext: TableContext = $derived.by(() => ({
		sortKey,
		sortDir,
		search,
		page,
		pageSize,
		pageCount,
		total,
		useVirtual: virtual,
		visibleStart,
		visibleEnd,
		startIndex,
		hasActions: Boolean(actions),
		setSort,
		sortIcon,
		clearAll,
		goToPage,
		nextPage,
		prevPage,
		setPageSize,
		setSearch,
		toggleVirtual
	}));

	const fallbackRowKey = (item: unknown, absoluteIndex: number) => {
		if (item && typeof item === 'object') {
			const objectItem = item as object;
			const existing = objectRowIds.get(objectItem);
			if (existing) return existing;

			generatedRowId += 1;
			const created = `obj:${generatedRowId}`;
			objectRowIds.set(objectItem, created);
			return created;
		}

		return `idx:${absoluteIndex}`;
	};

	const rowKey = (item: unknown, absoluteIndex: number) => {
		const provided = getRowId(item, absoluteIndex);
		if (provided !== undefined && provided !== null && provided !== '') {
			return String(provided);
		}
		return fallbackRowKey(item, absoluteIndex);
	};

	const openColumnDropdown = (colKey: string) => {
		openColumn = colKey;
		pendingSortKey = colKey;
		pendingSortDir = sortDir as SortDir;
		pendingColumnFilters = cloneFilters(columnFilters);
	};

	const setPendingSortDir = (colKey: string, dir: SortDir) => {
		pendingSortKey = colKey;
		pendingSortDir = dir;
	};

	const toggleOption = (colKey: string, value: string) => {
		const next = { ...pendingColumnFilters };
		const current = next[colKey] ?? [];
		const exists = current.includes(value);
		next[colKey] = exists ? current.filter((entry) => entry !== value) : [...current, value];
		pendingColumnFilters = next;
	};

	const applyPending = () => {
		columnFilters = cloneFilters(pendingColumnFilters);
		sortKey = pendingSortKey;
		sortDir = pendingSortDir;
		openColumn = null;
		saveToStorage();
	};

	const savePending = () => {
		applyPending();
	};

	const closeDropdown = () => {
		openColumn = null;
		pendingColumnFilters = cloneFilters(columnFilters);
		pendingSortKey = sortKey;
		pendingSortDir = sortDir as SortDir;
	};
</script>

<div class={`cw-table flex h-full w-full flex-col ${className}`}>
	<TableToolbar
		{search}
		{isMobile}
		{virtual}
		{pageSize}
		{sortKey}
		{sortDir}
		{hasActiveFilters}
		{visibleStart}
		{visibleEnd}
		{total}
		onSearch={setSearch}
		onToggleVirtual={toggleVirtual}
		onSetPageSize={setPageSize}
		onClearAll={clearAll}
	/>

	<div class={`relative ${virtual ? 'flex min-h-0 flex-1 overflow-hidden' : 'w-full'}`}>
		<div
			class={`mobile-scroll-container w-full ${virtual ? 'flex h-full overflow-auto' : 'overflow-x-auto'}`}
			{@attach setScrollerRef}
			onscroll={virtual ? handleScroll : undefined}
			bind:clientHeight={containerHeight}
			style={virtual && viewportHeight > 0 ? `max-height:${viewportHeight}px` : ''}
		>
			<table
				class="w-full min-w-0 table-auto text-sm text-slate-50 md:min-w-[320px] md:text-base"
				style={`--cw-table-row-max:${rowMaxHeight}px;`}
			>
				<TableHeader
					{header}
					{columns}
					{actions}
					{tableContext}
					{sortKey}
					{sortDir}
					{openColumn}
					{pendingSortDir}
					{pendingColumnFilters}
					{columnHasFilter}
					{sortIcon}
					onOpenColumn={openColumnDropdown}
					onCloseDropdown={closeDropdown}
					onSetPendingSortDir={setPendingSortDir}
					onToggleOption={toggleOption}
					onApplyPending={applyPending}
					onSavePending={savePending}
				/>
				<TableBody
					{total}
					{empty}
					{columns}
					{actions}
					{row}
					{rowsToRender}
					{rowBaseIndex}
					{rowKey}
					{tableContext}
					{cell}
					{virtual}
					{topSpacer}
					{bottomSpacer}
					{rowHeight}
					{rowMaxHeight}
				/>
			</table>
		</div>

		{#if loading}
			<div class="absolute inset-0 z-10 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
				<div class="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 shadow-lg shadow-black/40">
					<span class="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-sky-400"></span>
					<span class="text-sm font-medium text-slate-100">{loadingText}</span>
				</div>
			</div>
		{/if}
	</div>

	<TableFooter
		{page}
		{pageCount}
		{virtual}
		{isMobile}
		{visibleStart}
		{visibleEnd}
		{total}
		onPrevPage={prevPage}
		onNextPage={nextPage}
	/>
</div>
