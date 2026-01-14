<script lang="ts">
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import CWButton from './CWButton.svelte';
	import CWSelect from './CWSelect.svelte';
	import CWDuration from './CWDuration.svelte';

	type SortDir = 'asc' | 'desc';
	type FilterFn<T> = (item: T, search: string) => boolean;
	type SortFn<T> = (a: T, b: T, key: string, dir: SortDir) => number;
	type RowIdFn<T> = (item: T, index: number) => string | number;

	type ColumnFilterOption = { value: string; label?: string };
	type ColumnFilter = { type: 'checkbox'; options: ColumnFilterOption[] };

	type BadgeEntry = { label?: string; dotClass?: string; badgeClass?: string };
	type ButtonConfig<T = unknown> = {
		label: string;
		variant?: 'primary' | 'ghost';
		onClick?: (row: T) => void;
		class?: string;
	};

	type SelectOption = { value: string | number; label: string };
	type SelectConfig<T = unknown> = {
		options: SelectOption[] | ((row: T) => SelectOption[]);
		placeholder?: string;
		onChange?: (row: T, value: string | number | null) => void;
		disabled?: boolean | ((row: T) => boolean);
		size?: 'sm' | 'md' | 'lg';
	};

	type ColumnConfig = {
		key: string;
		label: string;
		value?: string;
		secondaryKey?: string;
		type?: 'text' | 'number' | 'datetime' | 'stacked' | 'badge' | 'buttons' | 'select' | 'custom';
		href?: string | ((row: unknown) => string | undefined);
		suffix?: string;
		align?: 'left' | 'center' | 'right';
		sortable?: boolean;
		sortOrder?: string[];
		badges?: Record<string, BadgeEntry>;
		filter?: ColumnFilter;
		width?: string;
		cellClass?: string;
		buttons?: ButtonConfig[];
		select?: SelectConfig;
	};

	type TableContext = {
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
		setSort: (key: string, dir: SortDir) => void;
		sortIcon: (key: string) => string;
		clearAll: () => void;
		goToPage: (p: number) => void;
		nextPage: () => void;
		prevPage: () => void;
		setPageSize: (s: number) => void;
		setSearch: (s: string) => void;
		toggleVirtual: () => void;
	};

	// Export types for external use
	export type { ColumnConfig, SelectConfig, SelectOption, ButtonConfig, BadgeEntry, TableContext };

	const defaultFilter: FilterFn<unknown> = (item, search) => {
		if (!search.trim()) return true;
		const lowered = search.toLowerCase();
		return JSON.stringify(item ?? '')
			.toLowerCase()
			.includes(lowered);
	};

	const defaultSort: SortFn<unknown> = (a, b, key, dir) => {
		const left = (a as Record<string, unknown>)[key];
		const right = (b as Record<string, unknown>)[key];
		const dirMul = dir === 'asc' ? 1 : -1;

		if (typeof left === 'number' && typeof right === 'number') {
			return (left - right) * dirMul;
		}

		return String(left ?? '').localeCompare(String(right ?? '')) * dirMul;
	};

	const defaultRowId: RowIdFn<unknown> = (item, index) =>
		(item as { id?: string | number })?.id ?? index;

	const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

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
		cell?: Snippet<[{ item: unknown; col: ColumnConfig; value: unknown }]>;
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

	const columnMap = $derived.by(() => {
		const map: Record<string, ColumnConfig> = {};
		for (const col of columns) map[col.key] = col;
		return map;
	});

	const buildDefaultFilters = () => {
		const defaults: Record<string, string[]> = {};
		for (const col of columns) {
			if (col.filter?.type === 'checkbox') {
				defaults[col.key] = col.filter.options.map((o: ColumnFilterOption) => o.value);
			}
		}
		return defaults;
	};

	const defaultsSnapshot = () => buildDefaultFilters();

	let columnFilters = $state<Record<string, string[]>>(defaultsSnapshot());
	let pendingColumnFilters = $state<Record<string, string[]>>(defaultsSnapshot());
	let pendingSortKey = $state<string>(sortKey || (columns[0]?.key ?? ''));
	let pendingSortDir = $state<SortDir>(sortDir as SortDir);
	let openColumn = $state<string | null>(null);

	let scrollTop = $state(0);
	let scroller: HTMLDivElement | null = null;
	let containerHeight = $state(viewportHeight);
	let isMobile = $state(false);

	const setColumnFilters = (value: Record<string, string[]>) => {
		columnFilters = value;
	};

	const setPendingFilters = (value: Record<string, string[]>) => {
		pendingColumnFilters = value;
	};

	// Track deep changes so resorting reacts when cell values mutate
	const itemsVersion = $derived.by(() => JSON.stringify(items ?? []));

	const loadFromStorage = () => {
		if (!storageKey || typeof localStorage === 'undefined') return;
		const raw = localStorage.getItem(storageKey);
		if (!raw) return;
		try {
			const parsed = JSON.parse(raw) as {
				sortKey?: string;
				sortDir?: SortDir;
				filters?: Record<string, string[]>;
			};
			if (parsed.sortKey) sortKey = parsed.sortKey;
			if (parsed.sortDir) sortDir = parsed.sortDir;
			const defaults = buildDefaultFilters();
			const merged: Record<string, string[]> = { ...defaults };
			if (parsed.filters) {
				for (const col of columns) {
					const saved = parsed.filters[col.key];
					const defaultOptions = defaults[col.key];
					if (saved && saved.length > 0) {
						merged[col.key] = saved;
					} else {
						merged[col.key] = defaultOptions ?? [];
					}
				}
			}
			setColumnFilters(merged);
			setPendingFilters(merged);
		} catch (err) {
			console.warn('Failed to read table state', err);
		}
	};

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
		loadFromStorage();
		if (!sortKey && columns.length) {
			sortKey = columns[0].key;
		}

		const mq = window.matchMedia('(max-width: 640px)');
		const updateMobile = () => (isMobile = mq.matches);
		updateMobile();
		mq.addEventListener('change', updateMobile);
		return () => mq.removeEventListener('change', updateMobile);
	});

	const getColumnValue = (item: unknown, col: ColumnConfig) => {
		const record = item as Record<string, unknown>;
		if (col.value) return record[col.value];
		return record[col.key];
	};

	const resolveHref = (item: unknown, col: ColumnConfig) => {
		if (!col.href || col.type === 'buttons') return undefined;
		try {
			return typeof col.href === 'function' ? col.href(item) ?? undefined : col.href;
		} catch (error) {
			// Avoid breaking SSR if the resolver relies on browser-only globals.
			return undefined;
		}
	};

	const toDate = (value: unknown): Date | null => {
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

	const applyColumnFilters = (list: unknown[]) => {
		return list.filter((item) => {
			for (const col of columns) {
				const active = columnFilters[col.key];
				if (col.filter?.type === 'checkbox' && active?.length) {
					const value = String(getColumnValue(item, col) ?? '');
					if (!active.includes(value)) return false;
				}
			}
			return true;
		});
	};

	let tableItems = $derived.by(() => {
		itemsVersion; // ensure deep mutation tracking
		return Array.isArray(items) ? [...items] : [];
	});
	let filtered = $derived.by(() =>
		applyColumnFilters(tableItems.filter((i) => filterFn(i, search)))
	);

	const columnSort = (a: unknown, b: unknown, key: string, dir: SortDir) => {
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
			return (new Date(left as string).getTime() - new Date(right as string).getTime()) * dirMul;
		}
		if (col.type === 'buttons') {
			return 0;
		}
		return String(left ?? '').localeCompare(String(right ?? '')) * dirMul;
	};

	let sorted = $derived.by(() => {
		if (!sortKey) return [...filtered];
		return [...filtered].sort((a, b) => columnSort(a, b, sortKey, sortDir as SortDir));
	});

	let total = $derived(sorted.length);
	let pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));

	$effect(() => {
		if (virtual) return;
		if (page < 1) page = 1;
		if (page > pageCount) page = pageCount;
	});

	let paginated = $derived.by(() => {
		if (virtual) return sorted;
		const start = (page - 1) * pageSize;
		return sorted.slice(start, start + pageSize);
	});

	let startIndex = $derived(virtual ? Math.max(0, Math.floor(scrollTop / rowHeight)) : 0);
	let visibleCount = $derived(virtual ? Math.ceil(containerHeight / rowHeight) + 2 : pageSize);

	let visibleRows = $derived.by(() => {
		if (!virtual) return paginated;
		const end = Math.min(sorted.length, startIndex + visibleCount);
		return sorted.slice(startIndex, end);
	});

	let topSpacer = $derived(virtual ? startIndex * rowHeight : 0);
	let bottomSpacer = $derived(
		virtual
			? Math.max(sorted.length * rowHeight - topSpacer - visibleRows.length * rowHeight, 0)
			: 0
	);

	const handleScroll = () => {
		if (!scroller) return;
		scrollTop = scroller.scrollTop;
	};

	const setScrollerRef = (node: HTMLDivElement) => {
		scroller = node;
		return () => {
			if (scroller === node) {
				scroller = null;
			}
		};
	};

	const setSort = (key: string) => {
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
		const defaults = defaultsSnapshot();
		setColumnFilters(defaults);
		setPendingFilters(defaults);
		pendingSortKey = columns[0]?.key ?? '';
		pendingSortDir = 'asc';
		page = 1;
		openColumn = null;
		saveToStorage();
	};

	const columnHasFilter = (colKey: string) => {
		const defaults = defaultsSnapshot();
		const active = columnFilters[colKey] ?? [];
		const def = defaults[colKey] ?? [];
		return active.length !== def.length;
	};

	const hasActiveFilters = $derived.by(() => {
		const defaults = defaultsSnapshot();
		for (const key in defaults) {
			const active = columnFilters[key] ?? [];
			if (active.length !== defaults[key]?.length) return true;
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
		visibleRows;
		if (virtual && scroller && scrollTop > scroller.scrollHeight) {
			scroller.scrollTop = 0;
		}
	});

	const visibleStart = $derived(
		virtual ? Math.min(total, startIndex + 1) : Math.min(total, (page - 1) * pageSize + 1)
	);
	const visibleEnd = $derived(
		virtual
			? Math.min(total, startIndex + visibleRows.length)
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

	const toggleOption = (colKey: string, value: string) => {
		const next = { ...pendingColumnFilters };
		const current = next[colKey] ?? [];
		const exists = current.includes(value);
		next[colKey] = exists ? current.filter((v) => v !== value) : [...current, value];
		setPendingFilters(next);
	};

	const applyPending = () => {
		setColumnFilters({ ...pendingColumnFilters });
		sortKey = pendingSortKey;
		sortDir = pendingSortDir;
		openColumn = null;
		saveToStorage();
	};

	const savePending = () => {
		applyPending();
		saveToStorage();
	};

	const closeDropdown = () => {
		openColumn = null;
		setPendingFilters({ ...columnFilters });
		pendingSortKey = sortKey;
		pendingSortDir = sortDir as SortDir;
	};

	const alignClass = (align?: string) => {
		if (align === 'right') return 'text-right';
		if (align === 'center') return 'text-center';
		return 'text-left';
	};

	const buttonClasses = (variant?: string) => {
		if (variant === 'ghost') {
			return 'rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 hover:bg-slate-800';
		}
		return 'rounded-md bg-sky-500 px-3 py-1 text-[11px] font-medium text-slate-950 shadow-sm transition hover:bg-sky-400';
	};
</script>

<div class={`cw-table flex h-full w-full flex-col ${className}`}>
	<div
		class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-950/60 px-3 py-2 sm:gap-3 sm:px-4 sm:py-3"
	>
		<div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
			<label class="hidden sm:block text-slate-400" for="table-search">Search</label>
			<div class="relative flex-1 sm:flex-none">
				<input
					id="table-search"
					value={search}
					oninput={(event) => setSearch(event.currentTarget.value)}
					class="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-base text-slate-100 shadow-sm outline-none ring-1 ring-slate-800 focus:border-sky-500 focus:ring-sky-500 sm:w-64"
					placeholder="Search rows..."
				/>
				{#if search}
					<button
						class="absolute inset-y-0 right-2 text-slate-400 hover:text-slate-300"
						type="button"
						onclick={() => setSearch('')}
						aria-label="Clear search"
					>
						✕
					</button>
				{/if}
			</div>
		</div>

		<div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end sm:gap-3">
			{#if !isMobile}
				<button
					type="button"
					class={`virtual-toggle inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm transition ${
						virtual
							? 'border-sky-500/70 bg-sky-500/10 text-sky-200'
							: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-600'
					}`}
					onclick={toggleVirtual}
				>
					<span class={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${virtual ? 'bg-sky-400' : 'bg-slate-500'}`}></span>
					<span>{virtual ? 'Virtual' : 'Paged'}</span>
				</button>
			{/if}

			<label class="hidden sm:flex items-center gap-2 text-slate-400">
				<span>Page size</span>
				<select
					class="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
					onchange={(event) => setPageSize(Number(event.currentTarget.value))}
					value={pageSize}
				>
					<option value="10">10</option>
					<option value="12">12</option>
					<option value="15">15</option>
					<option value="25">25</option>
					<option value="50">50</option>
				</select>
			</label>

			{#if (sortKey || hasActiveFilters) && !isMobile}
				<div class="flex flex-wrap items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs sm:gap-2 sm:text-sm text-slate-200">
					{#if sortKey}
						<span class="inline-flex items-center gap-1 rounded bg-sky-500/15 px-1.5 py-0.5 sm:px-2 text-sky-200">
							{sortKey} {sortDir === 'asc' ? '↑' : '↓'}
						</span>
					{/if}
					{#if hasActiveFilters}
						<span class="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 sm:px-2 text-amber-200">
							Filtered
						</span>
					{/if}
					<button
						type="button"
						class="rounded bg-slate-800 px-1.5 py-0.5 sm:px-2 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
						onclick={clearAll}
					>
						Clear
					</button>
				</div>
			{/if}

			<div class="ml-auto text-xs sm:ml-0 sm:text-sm text-slate-400">
				{visibleStart}–{visibleEnd} of {total}
			</div>
		</div>
	</div>

	<div class={`relative ${virtual ? 'flex min-h-0 flex-1 overflow-hidden' : 'w-full'}`}>
		<div
			class={`mobile-scroll-container w-full ${virtual ? 'flex h-full overflow-auto' : 'overflow-x-auto'}`}
			{@attach setScrollerRef}
			onscroll={virtual ? handleScroll : undefined}
			bind:clientHeight={containerHeight}
			style={virtual && viewportHeight > 0 ? `max-height:${viewportHeight}px` : ''}
		>
			<table
				class="w-full min-w-0 table-auto text-sm text-slate-50 md:text-base md:min-w-[320px]"
				style={`--cw-table-row-max:${rowMaxHeight}px;`}
			>
				<thead class="sticky top-0 bg-slate-900/90 text-slate-300 backdrop-blur">
					{#if header}
						{@render header(tableContext)}
					{:else if columns.length}
						<tr class="border-b border-slate-800 text-xs md:text-sm uppercase tracking-wide">
							{#each columns as col (col.key)}
								<th class={`relative px-2 md:px-3 py-2 ${alignClass(col.align)}`} style={col.width ?? ''}>
									<button
										class="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-slate-800/80"
										onclick={() => {
											if (openColumn === col.key) {
												closeDropdown();
											} else {
												openColumn = col.key;
												pendingSortKey = col.key;
												pendingSortDir = sortDir as SortDir;
												setPendingFilters({ ...columnFilters });
											}
										}}
									>
										<span>{col.label}</span>
										{#if col.sortable !== false}
											<span class={col.key === sortKey ? 'text-sky-300' : ''}>{sortIcon(col.key)}</span>
										{/if}
										{#if col.filter}
											<span class={`text-slate-400 ${columnHasFilter(col.key) ? 'text-amber-300' : ''}`}>
												▾
											</span>
										{/if}
									</button>

									{#if openColumn === col.key}
										<div
											class="absolute left-0 z-30 mt-2 w-64 rounded-lg border border-slate-700 bg-slate-900 p-3 text-[12px] shadow-xl ring-1 ring-slate-800"
										>
											<div class="mb-2 text-[11px] font-semibold uppercase text-slate-400">
												Sort order
											</div>
											<div class="mb-3 space-y-1">
												<label class="flex items-center gap-2 text-slate-200">
													<input
														type="radio"
														name={`sort-${col.key}`}
														value="asc"
														checked={pendingSortDir === 'asc'}
														onchange={() => {
															pendingSortKey = col.key;
															pendingSortDir = 'asc';
														}}
													/>
													<span>Ascending</span>
												</label>
												<label class="flex items-center gap-2 text-slate-200">
													<input
														type="radio"
														name={`sort-${col.key}`}
														value="desc"
														checked={pendingSortDir === 'desc'}
														onchange={() => {
															pendingSortKey = col.key;
															pendingSortDir = 'desc';
														}}
													/>
													<span>Descending</span>
												</label>
											</div>

											{#if col.filter?.type === 'checkbox'}
												<div class="mb-2 text-[11px] font-semibold uppercase text-slate-400">
													Types
												</div>
												<div class="space-y-1">
													{#each col.filter.options as opt (opt.value)}
														<label
															class="flex items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-slate-800/70"
														>
															<div class="flex items-center gap-2">
																<input
																	type="checkbox"
																	checked={pendingColumnFilters[col.key]?.includes(opt.value)}
																	onchange={() => toggleOption(col.key, opt.value)}
																/>
																<span class="capitalize text-slate-100"
																	>{opt.label ?? opt.value}</span
																>
															</div>
														</label>
													{/each}
												</div>
											{/if}

											<div
												class="mt-3 flex items-center justify-end gap-2 border-t border-slate-800 pt-3 text-[11px]"
											>
												<button
													class="rounded-md bg-slate-800 px-3 py-1 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
													onclick={applyPending}
												>
													OK
												</button>
												<button
													class="rounded-md bg-sky-600 px-3 py-1 text-slate-950 ring-1 ring-sky-500 hover:bg-sky-500"
													onclick={savePending}
												>
													SAVE
												</button>
												<button
													class="rounded-md bg-slate-800 px-3 py-1 text-slate-200 ring-1 ring-slate-700 hover:bg-slate-700"
													onclick={closeDropdown}
												>
													Close
												</button>
											</div>
										</div>
									{/if}
								</th>
							{/each}
							{#if actions}
								<th class="px-2 md:px-3 py-2 text-right">Actions</th>
							{/if}
						</tr>
					{:else}
						<tr class="border-b border-slate-800 text-[11px] uppercase tracking-wide">
							<th class="px-3 py-2 text-left">Items</th>
							{#if actions}
								<th class="px-3 py-2 text-right">Actions</th>
							{/if}
						</tr>
					{/if}
				</thead>

				<tbody>
					{#if total === 0}
						{#if empty}
							{@render empty()}
						{:else}
							<tr>
								<td
									colspan={actions ? columns.length + 1 : columns.length || 1}
									class="px-4 py-10 text-center text-sm text-slate-400"
								>
									No results match the current filters.
								</td>
							</tr>
						{/if}
					{:else if virtual}
						{#if topSpacer > 0}
							<tr class="spacer-row" aria-hidden="true" style={`height:${topSpacer}px`}></tr>
						{/if}

						{#if row}
							{#each visibleRows as item, idx (getRowId(item, startIndex + idx))}
								{@render row(item, startIndex + idx, tableContext)}
							{/each}
						{:else}
							{#each visibleRows as item, idx (getRowId(item, startIndex + idx))}
								<tr class="border-t border-slate-900/80 even:bg-slate-800/40 hover:bg-blue-800/70" style={`height:${rowHeight}px`}>
									{#if columns.length}
										{#each columns as col (col.key)}
											<td
												class={`px-2 md:px-3 py-2 align-middle ${alignClass(col.align)} ${col.cellClass ?? ''}`}
												style={col.width ?? ''}
												data-label={col.label}
											>
												{#if col.href && col.type !== 'buttons' && col.type !== 'select' && col.type !== 'custom'}
													<a
														href={resolveHref(item, col) ?? undefined}
														class="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 hover:underline decoration-sky-400/70 decoration-1"
													>
														{#if col.type === 'badge' && col.badges}
															{@const raw = getColumnValue(item, col)}
															{@const badge = col.badges[String(raw)]}
															{#if badge}
																<div class="flex items-center gap-2">
																	{#if badge.dotClass}
																		<span class={`h-2 w-2 rounded-full ${badge.dotClass}`}></span>
																	{/if}
																	<span
																		class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${badge.badgeClass ?? ''}`}
																	>
																		{badge.label ?? String(raw)}
																	</span>
																</div>
															{:else}
																<span>{String(raw ?? '')}</span>
															{/if}
														{:else if col.type === 'stacked'}
															{@const primary = getColumnValue(item, col)}
															{@const secondary = (item as Record<string, unknown>)[col.secondaryKey ?? '']}
															<div class="flex flex-col text-left">
																<span class="text-base font-semibold text-slate-50">{primary}</span>
																{#if secondary}
																	<span class="text-sm text-slate-400">{secondary}</span>
																{/if}
															</div>
														{:else if col.type === 'datetime'}
															{@const raw = getColumnValue(item, col)}
															{@const dt = toDate(raw)}
															<div class="flex flex-col">
																<span class="font-mono text-sm text-slate-400">
																	{#if dt}
																		<CWDuration date={dt} />
																	{:else}
																		—
																	{/if}
																</span>
																{#if dt}
																	<span class="font-mono text-xs text-slate-500">
																		{dt.toLocaleString()}
																	</span>
																{/if}
															</div>
														{:else}
															{@const raw = getColumnValue(item, col)}
															{#if col.type === 'number'}
																<span class="font-mono text-base text-slate-50 font-medium">
																	{Number(raw).toLocaleString()}{col.suffix ?? ''}
																</span>
															{:else}
																<span class="text-slate-50">
																	{raw}{col.suffix ?? ''}
																</span>
															{/if}
														{/if}
														</a>
													{:else}
														<div class="block">
															{#if col.type === 'badge' && col.badges}
																{@const raw = getColumnValue(item, col)}
															{@const badge = col.badges[String(raw)]}
															{#if badge}
																<div class="flex items-center gap-2">
																	{#if badge.dotClass}
																		<span class={`h-2 w-2 rounded-full ${badge.dotClass}  ${badge.dotClass === 'bg-rose-500' ? 'animate-pulse' : ''}`}></span>
																	{/if}
																	<span
																		class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${badge.badgeClass ?? ''}`}
																	>
																		{badge.label ?? String(raw)}
																	</span>
																</div>
															{:else}
																<span>{String(raw ?? '')}</span>
															{/if}
														{:else if col.type === 'stacked'}
															{@const primary = getColumnValue(item, col)}
															{@const secondary = (item as Record<string, unknown>)[col.secondaryKey ?? '']}
															<div class="flex flex-col text-left">
																<span class="text-lg font-semibold text-slate-50 md:text-xl">{primary}</span>
																{#if secondary}
																	<span class="text-sm text-slate-400">{secondary}</span>
																{/if}
															</div>
														{:else if col.type === 'datetime'}
															{@const raw = getColumnValue(item, col)}
															{@const dt = toDate(raw)}
															<div class="flex flex-col">
																<span class="font-mono text-sm text-slate-300 md:text-base">
																	{#if dt}
																		<CWDuration date={dt} />
																	{:else}
																		—
																	{/if}
																</span>
																{#if dt}
																	<span class="font-mono text-xs text-slate-500">
																		{dt.toLocaleString()}
																	</span>
																{/if}
															</div>
														{:else}
															{@const raw = getColumnValue(item, col)}
															{#if col.type === 'number'}
																<span class="font-mono text-base text-slate-50 md:text-lg font-medium">
																	{Number(raw).toLocaleString()}{col.suffix ?? ''}
																</span>
															{:else if col.type === 'buttons' && col.buttons?.length}
																<div class="flex flex-wrap items-center justify-end gap-2">
																	{#each col.buttons as btn, bIdx (bIdx)}
																		<button
																			class={`${buttonClasses(btn.variant)} ${btn.class ?? ''}`}
																			type="button"
																			onclick={() => btn.onClick?.(item)}
																		>
																			{btn.label}
																		</button>
																	{/each}
																</div>
															{:else if col.type === 'select' && col.select}
																{@const selectConfig = col.select}
																{@const selectOptions = typeof selectConfig.options === 'function' ? selectConfig.options(item) : selectConfig.options}
																{@const isSelectDisabled = typeof selectConfig.disabled === 'function' ? selectConfig.disabled(item) : (selectConfig.disabled ?? false)}
																<CWSelect
																	options={selectOptions}
																	value={raw as string | number | null}
																	placeholder={selectConfig.placeholder ?? 'Select...'}
																	size={selectConfig.size ?? 'sm'}
																	disabled={isSelectDisabled}
																	onchange={(e) => {
																		const target = e.currentTarget as HTMLSelectElement;
																		const newValue =
																			target.value === ''
																				? null
																				: isNaN(Number(target.value))
																					? target.value
																					: Number(target.value);
																		selectConfig.onChange?.(item, newValue);
																	}}
																/>
															{:else if col.type === 'custom' && cell}
																{@render cell({ item, col, value: raw })}
															{:else}
																<span class="text-slate-50">
																	{raw}{col.suffix ?? ''}
																</span>
															{/if}
														{/if}
													</div>
												{/if}
											</td>
										{/each}
										{#if actions}
											<td class="whitespace-nowrap px-2 md:px-3 py-2 align-middle text-right" data-label="Actions">
												{@render actions(item, startIndex + idx, tableContext)}
											</td>
										{/if}
									{:else}
										<td class="px-2 md:px-3 py-2 text-slate-200">
											<pre class="text-xs text-slate-400">{JSON.stringify(item, null, 2)}</pre>
										</td>
									{/if}
								</tr>
							{/each}
						{/if}

						{#if bottomSpacer > 0}
							<tr class="spacer-row" aria-hidden="true" style={`height:${bottomSpacer}px`}></tr>
						{/if}
					{:else if row}
						{#each paginated as item, idx (getRowId(item, (page - 1) * pageSize + idx))}
							{@render row(item, (page - 1) * pageSize + idx, tableContext)}
						{/each}
					{:else}
						{#each paginated as item, idx (getRowId(item, (page - 1) * pageSize + idx))}
							<tr
								style={`max-height:${rowMaxHeight}px; height:auto;`}
								class="border-t border-slate-900/80 odd:bg-slate-700/40 even:bg-slate-800/50 hover:bg-blue-800/70 overflow-hidden"
							>
									{#if columns.length}
										{#each columns as col (col.key)}
											<td
												class={`px-2 md:px-3 align-middle ${alignClass(col.align)} ${col.cellClass ?? ''}`}
												style={col.width ?? ''}
												data-label={col.label}
											>
												{#if col.href && col.type !== 'buttons' && col.type !== 'select' && col.type !== 'custom'}
													<a
														href={resolveHref(item, col) ?? undefined}
														class="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 hover:underline decoration-sky-400/70 decoration-1"
													>
														{#if col.type === 'badge' && col.badges}
															{@const raw = getColumnValue(item, col)}
															{@const badge = col.badges[String(raw)]}
															{#if badge}
																<div class="flex items-center gap-2">
																	{#if badge.dotClass}
																		<span class={`h-2 w-2 rounded-full ${badge.dotClass}`}></span>
																	{/if}
																	<span
																		class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${badge.badgeClass ?? ''}`}
																	>
																		{badge.label ?? String(raw)}
																	</span>
																</div>
															{:else}
																<span>{String(raw ?? '')}</span>
															{/if}
														{:else if col.type === 'stacked'}
															{@const primary = getColumnValue(item, col)}
															{@const secondary = (item as Record<string, unknown>)[col.secondaryKey ?? '']}
															<div class="flex flex-col text-left">
																<span class="text-base font-semibold text-slate-50">{primary}</span>
																{#if secondary}
																	<span class="text-sm text-slate-400">{secondary}</span>
																{/if}
															</div>
														{:else if col.type === 'datetime'}
															{@const raw = getColumnValue(item, col)}
															{@const dt = toDate(raw)}
															<div class="flex flex-col">
																<span class="font-mono text-sm text-slate-400">
																	{#if dt}
																		<CWDuration date={dt} />
																	{:else}
																		—
																	{/if}
																</span>
																{#if dt}
																	<span class="font-mono text-xs text-slate-500">
																		{dt.toLocaleString()}
																	</span>
																{/if}
															</div>
														{:else}
															{@const raw = getColumnValue(item, col)}
															{#if col.type === 'number'}
																<span class="font-mono text-base text-slate-50 font-medium">
																	{Number(raw).toLocaleString()}{col.suffix ?? ''}
																</span>
															{:else}
																<span class="text-slate-50">
																	{raw}{col.suffix ?? ''}
																</span>
															{/if}
														{/if}
														</a>
													{:else}
														<div class="block">
															{#if col.type === 'badge' && col.badges}
																{@const raw = getColumnValue(item, col)}
															{@const badge = col.badges[String(raw)]}
															{#if badge}
																<div class="flex items-center gap-2">
																	{#if badge.dotClass}
																		<span class={`h-2 w-2 rounded-full ${badge.dotClass}`}></span>
																	{/if}
																	<span
																		class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] ${badge.badgeClass ?? ''}`}
																	>
																		{badge.label ?? String(raw)}
																	</span>
																</div>
															{:else}
																<span>{String(raw ?? '')}</span>
															{/if}
														{:else if col.type === 'stacked'}
															{@const primary = getColumnValue(item, col)}
															{@const secondary = (item as Record<string, unknown>)[col.secondaryKey ?? '']}
															<div class="flex flex-col text-left">
																<span class="text-base font-semibold text-slate-50">{primary}</span>
																{#if secondary}
																	<span class="text-sm text-slate-400">{secondary}</span>
																{/if}
															</div>
														{:else if col.type === 'datetime'}
															{@const raw = getColumnValue(item, col)}
															{@const dt = toDate(raw)}
															<div class="flex flex-col">
																<span class="font-mono text-sm text-slate-300 md:text-base">
																	{#if dt}
																		<CWDuration date={dt} />
																	{:else}
																		—
																	{/if}
																</span>
																{#if dt}
																	<span class="font-mono text-xs text-slate-500">
																		{dt.toLocaleString()}
																	</span>
																{/if}
															</div>
														{:else}
															{@const raw = getColumnValue(item, col)}
															{#if col.type === 'number'}
																<span class="font-mono text-base text-slate-50 font-medium">
																	{Number(raw).toLocaleString()}{col.suffix ?? ''}
																</span>
															{:else if col.type === 'buttons' && col.buttons?.length}
																<div class="flex flex-wrap items-center gap-2">
																	{#each col.buttons as btn, bIdx (bIdx)}
																		<CWButton
																			class={`${btn.class ?? ''}`}
																			variant={btn.variant}
																			onclick={() => btn.onClick?.(item)}
																		>
																			{btn.label}
																		</CWButton>
																	{/each}
																</div>
															{:else if col.type === 'select' && col.select}
																{@const selectConfig = col.select}
																{@const selectOptions = typeof selectConfig.options === 'function' ? selectConfig.options(item) : selectConfig.options}
																{@const isSelectDisabled = typeof selectConfig.disabled === 'function' ? selectConfig.disabled(item) : (selectConfig.disabled ?? false)}
																<CWSelect
																	options={selectOptions}
																	value={raw as string | number | null}
																	placeholder={selectConfig.placeholder ?? 'Select...'}
																	size={selectConfig.size ?? 'sm'}
																	disabled={isSelectDisabled}
																	onchange={(e) => {
																		const target = e.currentTarget as HTMLSelectElement;
																		const newValue = target.value === '' ? null : (isNaN(Number(target.value)) ? target.value : Number(target.value));
																		selectConfig.onChange?.(item, newValue);
																	}}
																/>
															{:else if col.type === 'custom' && cell}
																{@render cell({ item, col, value: raw })}
															{:else}
																<span class="text-slate-50">
																	{raw}{col.suffix ?? ''}
																</span>
															{/if}
														{/if}
													</div>
												{/if}
											</td>
										{/each}
										{#if actions}
											<td class="whitespace-nowrap px-2 md:px-3 align-middle text-right" data-label="Actions">
												{@render actions(item, (page - 1) * pageSize + idx, tableContext)}
										</td>
									{/if}
								{:else}
									<td class="px-2 md:px-3 text-slate-200">
										<pre class="text-xs text-slate-400">{JSON.stringify(item, null, 2)}</pre>
									</td>
								{/if}
							</tr>
						{/each}
					{/if}
				</tbody>
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
	<div
		class="mt-auto flex flex-col gap-3 border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs sm:text-sm text-slate-200 sm:flex-row sm:items-center sm:justify-between"
	>
		<div class="flex items-center justify-center gap-2 sm:justify-start">
			<button
				type="button"
				class="rounded-md bg-slate-900 px-3 py-1.5 text-slate-200 ring-1 ring-slate-700 transition enabled:hover:bg-slate-800 disabled:opacity-50"
				onclick={prevPage}
				disabled={page === 1 || virtual}
			>
				Prev
			</button>
			<span class="text-slate-400">
				Page {page} of {pageCount}
			</span>
			<button
				type="button"
				class="rounded-md bg-slate-900 px-3 py-1.5 text-slate-200 ring-1 ring-slate-700 transition enabled:hover:bg-slate-800 disabled:opacity-50"
				onclick={nextPage}
				disabled={page === pageCount || virtual}
			>
				Next
			</button>
		</div>

		<div class="text-[11px] text-center sm:text-right text-slate-400">
			{#if isMobile}
				<span>Showing {visibleStart}–{visibleEnd} of {total}</span>
			{:else if virtual}
				<span>Virtualized list • {total} rows</span>
			{:else}
				<span>
					Rows {visibleStart}–{visibleEnd} of {total}
				</span>
			{/if}
		</div>
	</div>
</div>

<style>
	/* Mobile card view - completely rewritten for proper card layout */
	@media (max-width: 640px) {
		:global(.cw-table .virtual-toggle) {
			display: none !important;
		}

		/* Make the main container allow proper flex sizing */
		:global(.cw-table) {
			display: flex !important;
			flex-direction: column !important;
			height: 100% !important;
			max-height: 100% !important;
			overflow: hidden !important;
		}

		/* The flex-1 wrapper should take remaining space */
		:global(.cw-table > .flex-1) {
			flex: 1 1 0% !important;
			min-height: 0 !important;
			overflow: hidden !important;
		}

		/* Make the scroller scrollable on mobile - this is critical for touch scrolling */
		:global(.cw-table .mobile-scroll-container) {
			overflow-y: auto !important;
			overflow-x: hidden !important;
			-webkit-overflow-scrolling: touch !important;
			overscroll-behavior: contain !important;
			flex: 1 !important;
			display: block !important;
			height: auto !important;
			max-height: 100% !important;
		}

		/* Hide the table header on mobile */
		:global(.cw-table thead) {
			display: none !important;
		}

		/* Convert table to block display */
		:global(.cw-table table) {
			display: block !important;
			font-size: 0.95rem !important;
			width: 100% !important;
		}

		/* tbody as flex column for cards */
		:global(.cw-table tbody) {
			display: flex !important;
			flex-direction: column !important;
			gap: 0.75rem !important;
			padding: 0.75rem !important;
		}

		/* Each row becomes a card */
		:global(.cw-table tbody tr:not(.spacer-row)) {
			display: flex !important;
			flex-direction: column !important;
			gap: 0 !important;
			border: 1px solid rgb(51 65 85 / 0.8) !important;
			border-radius: 0.75rem !important;
			background: linear-gradient(135deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98)) !important;
			padding: 0 !important;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
			overflow: hidden !important;
		}

		:global(.cw-table tbody tr:not(.spacer-row):hover) {
			border-color: rgb(56 189 248 / 0.5) !important;
		}

		/* Each cell as a row in the card */
		:global(.cw-table tbody tr:not(.spacer-row) td) {
			display: flex !important;
			flex-direction: row !important;
			align-items: center !important;
			justify-content: space-between !important;
			gap: 1rem !important;
			padding: 0.625rem 1rem !important;
			border: none !important;
			border-bottom: 1px solid rgb(51 65 85 / 0.4) !important;
			background: transparent !important;
			min-height: 2.5rem !important;
		}

		:global(.cw-table tbody tr:not(.spacer-row) td:last-child) {
			border-bottom: none !important;
		}

		/* Label before each cell value */
		:global(.cw-table tbody tr:not(.spacer-row) td::before) {
			content: attr(data-label) !important;
			display: block !important;
			flex-shrink: 0 !important;
			min-width: 6rem !important;
			max-width: 7rem !important;
			text-transform: uppercase !important;
			font-size: 0.625rem !important;
			font-weight: 700 !important;
			letter-spacing: 0.06em !important;
			color: rgb(148 163 184) !important;
			line-height: 1.4 !important;
		}

		/* Cell content wrapper - the div or anchor inside td */
		:global(.cw-table tbody tr:not(.spacer-row) td > a),
		:global(.cw-table tbody tr:not(.spacer-row) td > div) {
			flex: 1 !important;
			display: flex !important;
			justify-content: flex-end !important;
			align-items: center !important;
			text-align: right !important;
			word-break: break-word !important;
			min-width: 0 !important;
		}

		/* Text spans should also align right */
		:global(.cw-table tbody tr:not(.spacer-row) td span) {
			text-align: right !important;
		}

		/* Stacked columns (name + secondary text) */
		:global(.cw-table tbody tr:not(.spacer-row) td .flex.flex-col) {
			align-items: flex-end !important;
			text-align: right !important;
		}

		/* Badge containers */
		:global(.cw-table tbody tr:not(.spacer-row) td .flex.items-center) {
			justify-content: flex-end !important;
		}

		/* Button containers in cells */
		:global(.cw-table tbody tr:not(.spacer-row) td .flex.flex-wrap) {
			justify-content: flex-end !important;
			width: 100% !important;
		}

		/* Actions row - special styling */
		:global(.cw-table tbody tr:not(.spacer-row) td[data-label="Actions"]) {
			background: rgba(15, 23, 42, 0.6) !important;
			padding: 0.75rem 1rem !important;
			border-top: 1px solid rgb(51 65 85 / 0.6) !important;
			border-bottom: none !important;
		}

		:global(.cw-table tbody tr:not(.spacer-row) td[data-label="Actions"]::before) {
			display: none !important;
		}

		:global(.cw-table tbody tr:not(.spacer-row) td[data-label="Actions"] > div) {
			width: 100% !important;
			justify-content: center !important;
		}

		/* Spacer rows should be hidden */
		:global(.cw-table tbody tr.spacer-row) {
			display: none !important;
		}
	}

	/* Tablet adjustments (641px - 1024px) */
	@media (min-width: 641px) and (max-width: 1024px) {
		:global(.cw-table table) {
			font-size: 0.9rem;
		}

		:global(.cw-table th),
		:global(.cw-table td) {
			padding: 0.5rem 0.625rem;
		}
	}

	/* Desktop - ensure proper table display */
	@media (min-width: 641px) {
		:global(.cw-table table) {
			display: table;
		}

		:global(.cw-table thead) {
			display: table-header-group;
		}

		:global(.cw-table tbody) {
			display: table-row-group;
		}

		:global(.cw-table tr) {
			display: table-row;
		}

		:global(.cw-table th),
		:global(.cw-table td) {
			display: table-cell;
		}

		:global(.cw-table tbody tr td::before) {
			display: none !important;
		}
	}

		/* Desktop row cap */
		@media (min-width: 641px) {
			:global(.cw-table tbody tr:not(.spacer-row)) {
				height: auto;
				max-height: var(--cw-table-row-max, 64px);
				overflow: hidden;
			}

			:global(.cw-table tbody tr:not(.spacer-row) td) {
				padding-top: 0.5rem;
				padding-bottom: 0.5rem;
			}
		}
	</style>
