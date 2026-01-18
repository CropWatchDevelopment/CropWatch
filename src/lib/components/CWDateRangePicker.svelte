<script lang="ts">
	import { on } from 'svelte/events';
	import { SvelteDate } from 'svelte/reactivity';

	export interface DateRangeValue {
		start: Date | null;
		end: Date | null;
	}

	export type DateRangeType = 'day' | 'week' | 'month' | 'year';

	let {
		value = $bindable<DateRangeValue>({ start: null, end: null }),
		minDate = null,
		maxDate = null,
		placeholder = 'Select date range',
		rangeType = 'day',
		disabled = false,
		class: className = ''
	}: {
		value?: DateRangeValue;
		minDate?: Date | null;
		maxDate?: Date | null;
		placeholder?: string;
		rangeType?: DateRangeType;
		disabled?: boolean;
		class?: string;
	} = $props();

	let isOpen = $state(false);
	let selecting: 'start' | 'end' = $state('start');
	let hoverDate = $state<Date | null>(null);
	const currentMonth = new SvelteDate();
	let yearCursor = $state(new Date().getFullYear());
	let pickerRef: HTMLDivElement | null = null;
	let dropdownRef: HTMLDivElement | null = null;

	const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const monthFormatter = new Intl.DateTimeFormat('en-US', {
		month: 'short',
		year: 'numeric'
	});
	const yearFormatter = new Intl.DateTimeFormat('en-US', { year: 'numeric' });

	const formatDate = (date: Date | null): string => {
		if (!date) return '';
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const formatMonth = (date: Date | null): string => {
		if (!date) return '';
		return monthFormatter.format(date);
	};

	const formatYear = (date: Date | null): string => {
		if (!date) return '';
		return yearFormatter.format(date);
	};

	const displayValue = $derived.by(() => {
		if (rangeType === 'month') {
			const date = value.start ?? value.end;
			return date ? formatMonth(date) : placeholder;
		}
		if (rangeType === 'year') {
			const date = value.start ?? value.end;
			return date ? formatYear(date) : placeholder;
		}
		if (rangeType === 'week') {
			if (value.start && value.end) {
				return `Week of ${formatDate(value.start)} – ${formatDate(value.end)}`;
			}
			if (value.start) {
				return `Week of ${formatDate(value.start)}`;
			}
			return placeholder;
		}
		if (value.start && value.end) {
			return `${formatDate(value.start)} – ${formatDate(value.end)}`;
		}
		if (value.start) {
			return `${formatDate(value.start)} – ...`;
		}
		return placeholder;
	});

	const isSameDay = (a: Date, b: Date): boolean => {
		return a.getFullYear() === b.getFullYear() &&
			a.getMonth() === b.getMonth() &&
			a.getDate() === b.getDate();
	};

	const isSameMonth = (a: Date, b: Date): boolean => {
		return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
	};

	const isSameYear = (a: Date, b: Date): boolean => {
		return a.getFullYear() === b.getFullYear();
	};

	const normalizeStart = (date: Date): Date => {
		const next = new SvelteDate(date);
		next.setHours(0, 0, 0, 0);
		return next;
	};

	const normalizeEnd = (date: Date): Date => {
		const next = new SvelteDate(date);
		next.setHours(23, 59, 59, 999);
		return next;
	};

	const getWeekRange = (date: Date): DateRangeValue => {
		const start = new SvelteDate(date);
		start.setDate(start.getDate() - start.getDay());
		const end = new SvelteDate(start);
		end.setDate(start.getDate() + 6);
		return { start: normalizeStart(start), end: normalizeEnd(end) };
	};

	const getMonthRange = (year: number, month: number): DateRangeValue => {
		const start = new SvelteDate(year, month, 1);
		const end = new SvelteDate(year, month + 1, 0);
		return { start: normalizeStart(start), end: normalizeEnd(end) };
	};

	const getYearRange = (year: number): DateRangeValue => {
		const start = new SvelteDate(year, 0, 1);
		const end = new SvelteDate(year, 11, 31);
		return { start: normalizeStart(start), end: normalizeEnd(end) };
	};

	const isInRange = (date: Date): boolean => {
		if (!value.start) return false;
		const end = rangeType === 'day' ? (value.end || hoverDate) : value.end;
		if (!end) return false;

		const start = value.start < end ? value.start : end;
		const endDate = value.start < end ? end : value.start;
		return date > start && date < endDate;
	};

	const isRangeStart = (date: Date): boolean => {
		if (!value.start) return false;
		return isSameDay(date, value.start);
	};

	const isRangeEnd = (date: Date): boolean => {
		const end = value.end || (rangeType === 'day' && selecting === 'end' ? hoverDate : null);
		if (!end) return false;
		return isSameDay(date, end);
	};

	const isDisabled = (date: Date): boolean => {
		if (minDate && date < minDate) return true;
		if (maxDate && date > maxDate) return true;
		return false;
	};

	const getDaysInMonth = (year: number, month: number): number => {
		return new Date(year, month + 1, 0).getDate();
	};

	const getFirstDayOfMonth = (year: number, month: number): number => {
		return new Date(year, month, 1).getDay();
	};

	const calendarDays = $derived.by(() => {
		const year = currentMonth.getFullYear();
		const month = currentMonth.getMonth();
		const daysInMonth = getDaysInMonth(year, month);
		const firstDay = getFirstDayOfMonth(year, month);

		const days: (Date | null)[] = [];

		// Padding for days before the 1st
		for (let i = 0; i < firstDay; i++) {
			days.push(null);
		}

		// Actual days
		for (let d = 1; d <= daysInMonth; d++) {
			days.push(new Date(year, month, d));
		}

		return days;
	});

	const monthGrid = $derived.by(() =>
		MONTHS.map((label, index) => ({ label, index }))
	);

	const yearGrid = $derived.by(() => {
		const start = yearCursor - 5;
		return Array.from({ length: 12 }, (_, i) => start + i);
	});

	const yearRangeLabel = $derived.by(() => {
		const years = yearGrid;
		return years.length ? `${years[0]}–${years[years.length - 1]}` : '';
	});

	const isMonthSelected = (monthIndex: number): boolean => {
		if (!value.start) return false;
		return isSameMonth(value.start, new Date(value.start.getFullYear(), monthIndex, 1));
	};

	const isYearSelected = (year: number): boolean => {
		if (!value.start) return false;
		return isSameYear(value.start, new Date(year, 0, 1));
	};

	const isMonthDisabled = (year: number, monthIndex: number): boolean => {
		const range = getMonthRange(year, monthIndex);
		if (minDate && range.end && range.end < minDate) return true;
		if (maxDate && range.start && range.start > maxDate) return true;
		return false;
	};

	const isYearDisabled = (year: number): boolean => {
		const range = getYearRange(year);
		if (minDate && range.end && range.end < minDate) return true;
		if (maxDate && range.start && range.start > maxDate) return true;
		return false;
	};

	const prevPeriod = () => {
		if (rangeType === 'year') {
			yearCursor -= 12;
			return;
		}
		if (rangeType === 'month') {
			currentMonth.setFullYear(currentMonth.getFullYear() - 1);
			return;
		}
		currentMonth.setMonth(currentMonth.getMonth() - 1);
	};

	const nextPeriod = () => {
		if (rangeType === 'year') {
			yearCursor += 12;
			return;
		}
		if (rangeType === 'month') {
			currentMonth.setFullYear(currentMonth.getFullYear() + 1);
			return;
		}
		currentMonth.setMonth(currentMonth.getMonth() + 1);
	};

	const selectDate = (date: Date) => {
		if (isDisabled(date)) return;

		if (rangeType === 'week') {
			value = getWeekRange(date);
			selecting = 'start';
			isOpen = false;
			return;
		}

		if (selecting === 'start') {
			value = { start: normalizeStart(date), end: null };
			selecting = 'end';
		} else {
			if (value.start && date < value.start) {
				value = { start: normalizeStart(date), end: normalizeEnd(value.start) };
			} else {
				value = { ...value, end: normalizeEnd(date) };
			}
			selecting = 'start';
			isOpen = false;
		}
	};

	const selectMonth = (monthIndex: number) => {
		const year = currentMonth.getFullYear();
		if (isMonthDisabled(year, monthIndex)) return;
		value = getMonthRange(year, monthIndex);
		selecting = 'start';
		isOpen = false;
	};

	const selectYear = (year: number) => {
		if (isYearDisabled(year)) return;
		value = getYearRange(year);
		selecting = 'start';
		isOpen = false;
	};

	const clearSelection = () => {
		value = { start: null, end: null };
		selecting = 'start';
	};

	const setPresetDays = (days: number) => {
		const now = Date.now();
		const end = normalizeEnd(new SvelteDate(now));
		const start = normalizeStart(new SvelteDate(now - days * 24 * 60 * 60 * 1000));
		value = { start, end };
		isOpen = false;
	};

	const setPresetWeek = (offsetWeeks: number) => {
		const base = new SvelteDate();
		base.setDate(base.getDate() + offsetWeeks * 7);
		value = getWeekRange(base);
		isOpen = false;
	};

	const setPresetMonth = (offsetMonths: number) => {
		const base = new SvelteDate();
		base.setMonth(base.getMonth() + offsetMonths);
		value = getMonthRange(base.getFullYear(), base.getMonth());
		isOpen = false;
	};

	const setPresetYear = (offsetYears: number) => {
		const base = new SvelteDate();
		base.setFullYear(base.getFullYear() + offsetYears);
		value = getYearRange(base.getFullYear());
		isOpen = false;
	};

	const toggleOpen = () => {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen && value.start) {
			currentMonth.setFullYear(value.start.getFullYear());
			currentMonth.setMonth(value.start.getMonth());
			yearCursor = value.start.getFullYear();
		}
	};

	const positionDropdown = (node: HTMLDivElement) => {
		dropdownRef = node;
		const update = () => {
			if (!pickerRef || !dropdownRef) return;
			const rect = pickerRef.getBoundingClientRect();
			const top = rect.bottom + 8;
			const left = rect.left;
			dropdownRef.style.top = `${top}px`;
			dropdownRef.style.left = `${left}px`;
		};

		update();
		const handle = () => update();
		window.addEventListener('scroll', handle, true);
		window.addEventListener('resize', handle);

		// Handle click outside to close dropdown
		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			if (!pickerRef?.contains(target) && !dropdownRef?.contains(target)) {
				isOpen = false;
			}
		};

		// Use setTimeout to avoid closing on the same click that opened it
		let cleanupClick: (() => void) | null = null;
		const timeoutId = setTimeout(() => {
			cleanupClick = on(document, 'click', handleClickOutside);
		}, 0);

		return {
			destroy: () => {
				clearTimeout(timeoutId);
				cleanupClick?.();
				window.removeEventListener('scroll', handle, true);
				window.removeEventListener('resize', handle);
				dropdownRef = null;
			}
		};
	};

	const isToday = (date: Date): boolean => {
		const now = Date.now();
		const today = new SvelteDate(now);
		return isSameDay(date, today);
	};
</script>

<div
	bind:this={pickerRef}
	class={`relative z-[9999] inline-block w-full max-w-sm ${className}`}
>
	<!-- Trigger Button -->
	<button
		type="button"
		onclick={toggleOpen}
		disabled={disabled}
		class={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
			disabled
				? 'cursor-not-allowed border-slate-700 bg-slate-800/50 text-slate-400'
				: 'border-slate-700 bg-slate-900 text-slate-100 hover:border-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'
		}`}
	>
		<span class="flex items-center gap-2">
			<svg
				class="h-4 w-4 text-slate-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
				/>
			</svg>
			<span class={value.start ? 'text-slate-100' : 'text-slate-400'}>
				{displayValue}
			</span>
		</span>
		<span class="flex items-center gap-1">
			{#if value.start && !disabled}
				<span
					role="button"
					tabindex="0"
					onclick={(e) => {
						e.stopPropagation();
						clearSelection();
					}}
					onkeydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault();
							e.stopPropagation();
							clearSelection();
						}
					}}
					class="rounded-full p-0.5 text-slate-400 hover:bg-slate-700 hover:text-slate-200 cursor-pointer"
					aria-label="Clear selection"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</span>
			{:else}
				<svg
					class={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			{/if}
		</span>
	</button>

	<!-- Dropdown -->
	{#if isOpen}
		<div
			class="fixed z-[9999] mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl shadow-black/40 ring-1 ring-slate-800"
			role="dialog"
			tabindex="-1"
			use:positionDropdown
		>
			<!-- Presets -->
			<div class="mb-3 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
				{#if rangeType === 'day'}
					<button
						type="button"
						onclick={() => setPresetDays(7)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						Last 7 days
					</button>
					<button
						type="button"
						onclick={() => setPresetDays(30)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						Last 30 days
					</button>
					<button
						type="button"
						onclick={() => setPresetDays(90)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						Last 90 days
					</button>
				{:else if rangeType === 'week'}
					<button
						type="button"
						onclick={() => setPresetWeek(0)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						This week
					</button>
					<button
						type="button"
						onclick={() => setPresetWeek(-1)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						Last week
					</button>
				{:else if rangeType === 'month'}
					<button
						type="button"
						onclick={() => setPresetMonth(0)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						This month
					</button>
					<button
						type="button"
						onclick={() => setPresetMonth(-1)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						Last month
					</button>
				{:else}
					<button
						type="button"
						onclick={() => setPresetYear(0)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						This year
					</button>
					<button
						type="button"
						onclick={() => setPresetYear(-1)}
						class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
					>
						Last year
					</button>
				{/if}
			</div>

			<!-- Calendar Header -->
			<div class="mb-3 flex items-center justify-between">
				<button
					type="button"
					onclick={prevPeriod}
					class="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
					aria-label="Previous period"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="text-sm font-medium text-slate-200">
					{#if rangeType === 'year'}
						{yearRangeLabel}
					{:else if rangeType === 'month'}
						{currentMonth.getFullYear()}
					{:else}
						{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
					{/if}
				</span>
				<button
					type="button"
					onclick={nextPeriod}
					class="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
					aria-label="Next period"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

			{#if rangeType === 'day' || rangeType === 'week'}
				<!-- Day Names -->
				<div class="mb-2 grid grid-cols-7 gap-1">
					{#each DAYS as day (day)}
						<div class="text-center text-xs font-medium uppercase text-slate-400">
							{day.slice(0, 2)}
						</div>
					{/each}
				</div>

				<!-- Calendar Grid -->
				<div class="grid grid-cols-7 gap-1">
					{#each calendarDays as day, idx (idx)}
						{#if day === null}
							<div class="h-8 w-8"></div>
						{:else}
							<button
								type="button"
								onclick={() => selectDate(day)}
								onmouseenter={() => {
									if (rangeType === 'day' && selecting === 'end') hoverDate = day;
								}}
								onmouseleave={() => {
									hoverDate = null;
								}}
								disabled={isDisabled(day)}
								class={`flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors ${
									isRangeStart(day) || isRangeEnd(day)
										? 'bg-sky-500 font-medium text-slate-950'
										: isInRange(day)
											? 'bg-sky-500/20 text-sky-200'
											: isToday(day)
												? 'ring-1 ring-sky-500/50 text-slate-100'
												: isDisabled(day)
													? 'cursor-not-allowed text-slate-600'
													: 'text-slate-300 hover:bg-slate-800'
									}`}
							>
								{day.getDate()}
							</button>
						{/if}
					{/each}
				</div>
			{:else if rangeType === 'month'}
				<div class="grid grid-cols-3 gap-2">
					{#each monthGrid as monthItem (monthItem.index)}
						<button
							type="button"
							onclick={() => selectMonth(monthItem.index)}
							disabled={isMonthDisabled(currentMonth.getFullYear(), monthItem.index)}
							class={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
								isMonthSelected(monthItem.index)
									? 'border-sky-500 bg-sky-500/20 text-sky-200'
									: isMonthDisabled(currentMonth.getFullYear(), monthItem.index)
										? 'cursor-not-allowed border-slate-800 text-slate-600'
										: 'border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
							}`}
						>
							{monthItem.label.slice(0, 3)}
						</button>
					{/each}
				</div>
			{:else}
				<div class="grid grid-cols-3 gap-2">
					{#each yearGrid as year (year)}
						<button
							type="button"
							onclick={() => selectYear(year)}
							disabled={isYearDisabled(year)}
							class={`rounded-lg border px-3 py-2 text-xs font-semibold uppercase tracking-wide transition-colors ${
								isYearSelected(year)
									? 'border-sky-500 bg-sky-500/20 text-sky-200'
									: isYearDisabled(year)
										? 'cursor-not-allowed border-slate-800 text-slate-600'
										: 'border-slate-800 text-slate-300 hover:border-slate-600 hover:bg-slate-800'
							}`}
						>
							{year}
						</button>
					{/each}
				</div>
			{/if}

			<!-- Selection Status -->
			<div class="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
				<div class="flex items-center gap-2">
					<span class="text-slate-400">
						{#if rangeType === 'day'}
							{selecting === 'start' ? 'Select start date' : 'Select end date'}
						{:else if rangeType === 'week'}
							Select a week
						{:else if rangeType === 'month'}
							Select a month
						{:else}
							Select a year
						{/if}
					</span>
				</div>
				{#if value.start || value.end}
					<button
						type="button"
						onclick={clearSelection}
						class="rounded-md px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
					>
						Clear
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
