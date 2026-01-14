<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';

	export interface DateRangeValue {
		start: Date | null;
		end: Date | null;
	}

	let {
		value = $bindable<DateRangeValue>({ start: null, end: null }),
		minDate = null,
		maxDate = null,
		placeholder = 'Select date range',
		disabled = false,
		class: className = ''
	}: {
		value?: DateRangeValue;
		minDate?: Date | null;
		maxDate?: Date | null;
		placeholder?: string;
		disabled?: boolean;
		class?: string;
	} = $props();

	let isOpen = $state(false);
	let selecting: 'start' | 'end' = $state('start');
	let hoverDate = $state<Date | null>(null);
	const currentMonth = new SvelteDate();
	let pickerRef: HTMLDivElement | null = null;

	const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	const formatDate = (date: Date | null): string => {
		if (!date) return '';
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	};

	const displayValue = $derived.by(() => {
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

	const isInRange = (date: Date): boolean => {
		if (!value.start) return false;
		const end = value.end || hoverDate;
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
		const end = value.end || (selecting === 'end' ? hoverDate : null);
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

	const prevMonth = () => {
		currentMonth.setMonth(currentMonth.getMonth() - 1);
	};

	const nextMonth = () => {
		currentMonth.setMonth(currentMonth.getMonth() + 1);
	};

	const selectDate = (date: Date) => {
		if (isDisabled(date)) return;

		if (selecting === 'start') {
			value = { start: date, end: null };
			selecting = 'end';
		} else {
			if (value.start && date < value.start) {
				value = { start: date, end: value.start };
			} else {
				value = { ...value, end: date };
			}
			selecting = 'start';
			isOpen = false;
		}
	};

	const clearSelection = () => {
		value = { start: null, end: null };
		selecting = 'start';
	};

	const setPreset = (days: number) => {
		const now = Date.now();
		const end = new Date(now);
		const start = new Date(now - days * 24 * 60 * 60 * 1000);
		value = { start, end };
		isOpen = false;
	};

	const toggleOpen = () => {
		if (disabled) return;
		isOpen = !isOpen;
		if (isOpen && value.start) {
			currentMonth.setFullYear(value.start.getFullYear());
			currentMonth.setMonth(value.start.getMonth());
		}
	};

	const handleClickOutside = (event: MouseEvent) => {
		if (pickerRef && !pickerRef.contains(event.target as Node)) {
			isOpen = false;
		}
	};

	const setPickerRef = (node: HTMLDivElement) => {
		pickerRef = node;
		return () => {
			pickerRef = null;
		};
	};

	onMount(() => {
		document.addEventListener('click', handleClickOutside);
		return () => {
			document.removeEventListener('click', handleClickOutside);
		};
	});

	const isToday = (date: Date): boolean => {
		const now = Date.now();
		const today = new Date(now);
		return isSameDay(date, today);
	};
</script>

<div
	{@attach setPickerRef}
	class={`relative inline-block w-full max-w-sm ${className}`}
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
			class="absolute left-0 top-full z-50 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-4 shadow-xl shadow-black/40 ring-1 ring-slate-800"
		>
			<!-- Presets -->
			<div class="mb-3 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
				<button
					type="button"
					onclick={() => setPreset(7)}
					class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
				>
					Last 7 days
				</button>
				<button
					type="button"
					onclick={() => setPreset(30)}
					class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
				>
					Last 30 days
				</button>
				<button
					type="button"
					onclick={() => setPreset(90)}
					class="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300 ring-1 ring-slate-700 hover:bg-slate-700"
				>
					Last 90 days
				</button>
			</div>

			<!-- Calendar Header -->
			<div class="mb-3 flex items-center justify-between">
				<button
					type="button"
					onclick={prevMonth}
					class="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
					aria-label="Previous month"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<span class="text-sm font-medium text-slate-200">
					{MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
				</span>
				<button
					type="button"
					onclick={nextMonth}
					class="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
					aria-label="Next month"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</button>
			</div>

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
								if (selecting === 'end') hoverDate = day;
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

			<!-- Selection Status -->
			<div class="mt-3 flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
				<div class="flex items-center gap-2">
					<span class="text-slate-400">
						{selecting === 'start' ? 'Select start date' : 'Select end date'}
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
