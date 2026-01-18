<script lang="ts">
	import TrafficCalendarGrid from './TrafficCalendarGrid.svelte';
	import TrafficSidePanel from './TrafficSidePanel.svelte';
	import { SvelteDate, SvelteMap, SvelteSet } from 'svelte/reactivity';
	import type {
		TrafficCalendarCell,
		TrafficCalendarEntry,
		TrafficClass,
		TrafficClassKey,
		TrafficHourBin,
		TrafficRow,
		TrafficTotals
	} from './traffic.types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import CWDateRangePicker, { type DateRangeValue } from '../CWDateRangePicker.svelte';
	import CWSelect from '../CWSelect.svelte';

	let {
		rows = [],
		deviceName = 'Single camera',
		subtitle = 'Monthly calendar (daily totals) · Click a day for hourly breakdown'
	}: {
		rows?: TrafficRow[];
		deviceName?: string;
		subtitle?: string;
	} = $props();

	const CLASSES: TrafficClass[] = [
		{ key: 'people', label: 'People', short: '🚶' },
		{ key: 'bicycles', label: 'Bicycles', short: '🚲' },
		{ key: 'cars', label: 'Cars', short: '🚗' },
		{ key: 'trucks', label: 'Trucks', short: '🚚' },
		{ key: 'buses', label: 'Buses', short: '🚌' }
	];

	const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const now = new SvelteDate();
	const currentMonth = toMonthKeyUTC(now);

	let month = $state(currentMonth);
	let selectedDateOverride = $state<string | null>(null);
	let selectedLineOverride = $state('ALL');
	let hiddenSeries = $state<TrafficClassKey[]>([]);
	let dateRange = $state<{ start: Date | null; end: Date | null }>({
		start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
		end: new Date()
	});
	let lastRequestedRange = $state<string | null>(null);

	const aggregated = $derived.by(() => aggregateRows(rows));
	const availableLines = $derived.by(() => (aggregated.lines.length ? aggregated.lines : ['L1']));
	const monthOptions = $derived.by(() => buildMonthOptions(currentMonth));
	const lineOptions = $derived.by(() => [
		{ value: 'ALL', label: 'All lines' },
		...availableLines.map((line) => ({ value: line, label: line }))
	]);

	const monthLabel = $derived.by(() => {
		const [year, monthIndex] = month.split('-').map(Number);
		if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return month;
		const labelDate = new SvelteDate(Date.UTC(year, monthIndex - 1, 1));
		if (Number.isNaN(labelDate.getTime())) return month;
		return labelDate.toLocaleString('en', { month: 'long', year: 'numeric', timeZone: 'UTC' });
	});

	const monthCells = $derived.by(() => buildMonthCells(month, aggregated.dailyTotals));
	const monthDateKeys = $derived.by(() =>
		monthCells.filter((cell) => cell.inMonth && cell.dateKey).map((cell) => cell.dateKey as string)
	);

	const selectedDate = $derived.by(() => {
		const todayKey = toDateKeyUTC(new SvelteDate());
		const monthDates = monthDateKeys;
		if (monthDates.length === 0) return null;
		if (
			selectedDateOverride &&
			selectedDateOverride.startsWith(month) &&
			monthDates.includes(selectedDateOverride)
		) {
			return selectedDateOverride;
		}
		if (todayKey.startsWith(month) && monthDates.includes(todayKey)) return todayKey;
		return monthDates[0] ?? null;
	});

	const selectedTotals = $derived.by(() => {
		if (!selectedDate) return null;
		return aggregated.dailyTotals.get(selectedDate) ?? null;
	});

	const selectedLine = $derived.by(() =>
		availableLines.includes(selectedLineOverride) ? selectedLineOverride : 'ALL'
	);

	const selectedBins = $derived.by(() =>
		getHourlyBins(aggregated.hourlyByDayLine, selectedDate, selectedLine)
	);

	const selectedLineLabel = $derived.by(() =>
		selectedLine === 'ALL' ? 'Summed across lines' : `Line ${selectedLine}`
	);

	function handleSelectDay(event: CustomEvent<{ dateKey: string }>) {
		selectedDateOverride = event.detail.dateKey;
	}

	function handleToggleSeries(event: CustomEvent<{ key: TrafficClassKey }>) {
		const { key } = event.detail;
		hiddenSeries = hiddenSeries.includes(key)
			? hiddenSeries.filter((k) => k !== key)
			: [...hiddenSeries, key];
	}

	function jumpToToday() {
		month = currentMonth;
		selectedDateOverride = toDateKeyUTC(new SvelteDate());
		selectedLineOverride = 'ALL';
		const now = new Date();
		dateRange = {
			start: new Date(now.getFullYear(), now.getMonth(), 1),
			end: now
		};
	}

	async function handleMonthChange(range: DateRangeValue) {
		const base = range.start ?? range.end;
		if (!base) return;
		const { start, end } = getMonthBoundsUTC(base);
		const rangeKey = `${start.toISOString()}-${end.toISOString()}`;
		if (rangeKey === lastRequestedRange) return;
		lastRequestedRange = rangeKey;
		dateRange = { start, end };
		const params = new URLSearchParams(page.url.searchParams);
		params.set('trafficStart', start.toISOString());
		params.set('trafficEnd', end.toISOString());
		await goto(`${page.url.pathname}?${params.toString()}`, {
			replaceState: true,
			keepfocus: true,
			noScroll: true
		});
	}

	$effect(() => {
		if (dateRange.start) {
			const date = new Date(dateRange.start);
			month = toMonthKeyUTC(date);
		}
	});

	function emptyTotals(): TrafficTotals {
		return {
			people: 0,
			bicycles: 0,
			cars: 0,
			trucks: 0,
			buses: 0
		};
	}

	function ensureBins(): TrafficHourBin[] {
		return Array.from({ length: 24 }, (_, hour) => ({ hour, totals: emptyTotals() }));
	}

	function aggregateRows(data: TrafficRow[]) {
		const dailyTotals = new SvelteMap<string, TrafficTotals>();
		const hourlyByDayLine = new SvelteMap<string, SvelteMap<string, TrafficHourBin[]>>();
		const lines = new SvelteSet<string>();

		for (const row of data) {
			const timestamp = row.traffic_hour ?? row.created_at;
			const date = new SvelteDate(timestamp);
			if (Number.isNaN(date.getTime())) continue;

			const dateKey = toDateKeyUTC(date);
			const lineId = row.line_number != null ? `L${row.line_number}` : 'L1';

			lines.add(lineId);

			const totals = dailyTotals.get(dateKey) ?? emptyTotals();
			totals.people += row.people_count ?? 0;
			totals.bicycles += row.bicycle_count ?? 0;
			totals.cars += row.car_count ?? 0;
			totals.trucks += row.truck_count ?? 0;
			totals.buses += row.bus_count ?? 0;
			dailyTotals.set(dateKey, totals);

			const dayLines = hourlyByDayLine.get(dateKey) ?? new SvelteMap<string, TrafficHourBin[]>();
			const bins = dayLines.get(lineId) ?? ensureBins();
			const hour = date.getUTCHours();
			const bin = bins[hour];
			bin.totals.people += row.people_count ?? 0;
			bin.totals.bicycles += row.bicycle_count ?? 0;
			bin.totals.cars += row.car_count ?? 0;
			bin.totals.trucks += row.truck_count ?? 0;
			bin.totals.buses += row.bus_count ?? 0;
			dayLines.set(lineId, bins);
			hourlyByDayLine.set(dateKey, dayLines);
		}

		return {
			dailyTotals,
			hourlyByDayLine,
			lines: Array.from(lines).sort((a, b) => a.localeCompare(b))
		};
	}

	function getHourlyBins(
		hourlyMap: Map<string, Map<string, TrafficHourBin[]>>,
		dateKey: string | null,
		line: string
	) {
		if (!dateKey) return [];
		const dayLines = hourlyMap.get(dateKey);
		if (!dayLines) return [];

		if (line === 'ALL') {
			const bins = ensureBins();
			for (const lineBins of dayLines.values()) {
				for (const bin of lineBins) {
					const target = bins[bin.hour];
					for (const klass of CLASSES) {
						target.totals[klass.key] += bin.totals[klass.key] ?? 0;
					}
				}
			}
			return bins;
		}

		return dayLines.get(line) ?? [];
	}

	function buildMonthOptions(referenceMonth: string) {
		const [year, monthIndex] = referenceMonth.split('-').map(Number);
		const list: string[] = [];
		const start = new SvelteDate(Date.UTC(year, monthIndex - 1, 1));
		start.setUTCMonth(start.getUTCMonth() - 8);
		for (let i = 0; i < 18; i += 1) {
			const date = new SvelteDate(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
			list.push(toMonthKeyUTC(date));
		}
		return list;
	}

	function buildMonthCells(monthKey: string, dailyTotals: Map<string, TrafficTotals>) {
		const [year, monthIndex] = monthKey.split('-').map(Number);
		const monthStart = new SvelteDate(Date.UTC(year, monthIndex - 1, 1));
		const firstDow = monthStart.getUTCDay();
		const totalDays = daysInMonthUTC(year, monthIndex - 1);

		const cells: TrafficCalendarCell[] = [];

		for (let i = 0; i < 42; i += 1) {
			const dayNum = i - firstDow + 1;
			const inMonth = dayNum >= 1 && dayNum <= totalDays;
			if (!inMonth) {
				cells.push({ inMonth: false });
				continue;
			}
			const dateKey = `${year}-${pad2(monthIndex)}-${pad2(dayNum)}`;
			const totals = dailyTotals.get(dateKey) ?? emptyTotals();

			const entries: TrafficCalendarEntry[] = [...CLASSES]
				.map((klass) => ({
					key: klass.key,
					short: klass.short,
					value: totals[klass.key] ?? 0,
					dim: (totals[klass.key] ?? 0) === 0
				}))
				.sort((a, b) => b.value - a.value)
				.slice(0, 4);

			cells.push({
				inMonth: true,
				dayNum,
				dateKey,
				entries,
				weather: null
			});
		}

		return cells;
	}

	function toMonthKeyUTC(date: Date) {
		return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
	}

	function toDateKeyUTC(date: Date) {
		return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
	}

	function daysInMonthUTC(year: number, monthIndex: number) {
		return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	}

	function getMonthBoundsUTC(date: Date) {
		const year = date.getUTCFullYear();
		const monthIndex = date.getUTCMonth();
		const start = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
		const end = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59));
		return { start, end };
	}

	function pad2(value: number) {
		return String(value).padStart(2, '0');
	}
</script>



<section class="rounded-3xl border border-white/[0.14] bg-gradient-to-b from-[#070b14] to-[#0b1220] text-[#f2f6ff] shadow-[0_18px_40px_rgba(0,0,0,0.45)] overflow-visible" style="background: radial-gradient(1200px 700px at 20% 0%, #111f44 0%, transparent 55%), radial-gradient(900px 600px at 90% 15%, #0f2a4a 0%, transparent 60%), linear-gradient(180deg, #070b14, #0b1220);">
	<!-- NEVER EVER PUT A BACKDROP BLUR IN EHRE!!!-->
	<div class="p-3.5 border-b border-white/[0.14] bg-[rgba(14,26,51,0.78)] shadow-[0_8px_24px_rgba(0,0,0,0.28)] flex gap-3 items-center justify-between flex-wrap overflow-visible">
		<div class="flex flex-col gap-0.5">
			<div class="font-extrabold tracking-[0.2px]">Traffic counts · {deviceName}</div>
			<div class="text-[#f2f6ff]/70 text-xs">{subtitle}</div>
		</div>
		<div class="flex gap-2.5 items-center flex-row w-[50%] max-w-full">
			<span class="flex flex-auto"></span>
			<CWDateRangePicker
				rangeType="month"
				disabled={false}
				bind:value={dateRange}
				placeholder="Select month"
				onchange={handleMonthChange}
			/>
			<div class="w-32">
				<CWSelect
					options={lineOptions}
					bind:value={selectedLineOverride}
					size="sm"
					placeholder="Line"
				/>
			</div>
			<button class="px-3 py-2 rounded-[10px] border border-white/[0.14] bg-[rgba(22,36,74,0.85)] text-[#f2f6ff] text-xs cursor-pointer select-none shadow-[0_6px_16px_rgba(0,0,0,0.22)] hover:border-[rgba(125,184,255,0.9)]" type="button" onclick={jumpToToday}>Today</button>
		</div>
	</div>

	<div class="grid grid-cols-[1.8fr_1fr] min-h-0 max-[980px]:grid-cols-1">
		<main class="p-3.5 min-w-0 min-h-0 flex flex-col gap-2.5">
			<div class="flex items-start justify-between gap-3 flex-wrap">
				<div>
					<h2 class="font-extrabold text-sm tracking-[0.2px] m-0">{monthLabel} · Daily totals</h2>
					<div class="text-[#f2f6ff]/70 text-xs mt-1">Daily totals shown per day cell. UTC hours.</div>
				</div>
				<div class="flex flex-wrap gap-2 gap-x-2.5 items-center px-3 py-2.5 rounded-[14px] bg-[rgba(22,36,74,0.78)] border border-white/[0.14] shadow-[0_10px_28px_rgba(0,0,0,0.35)] max-w-full">
					{#each CLASSES as klass (klass.key)}
						<div class="flex gap-2 items-center text-[#f2f6ff]/80 text-xs whitespace-nowrap">
							<span class="min-w-[34px] px-1.5 py-0.5 rounded-full bg-white/10 border border-white/10 text-[#f2f6ff] font-extrabold text-xs text-center">{klass.short}</span>
							<span>{klass.label}</span>
						</div>
					{/each}
				</div>
			</div>

			<TrafficCalendarGrid
				weekdays={WEEKDAYS}
				cells={monthCells}
				{selectedDate}
				on:select={handleSelectDay}
			/>
		</main>

		<TrafficSidePanel
			{selectedDate}
			totals={selectedTotals}
			bins={selectedBins}
			classes={CLASSES}
			{hiddenSeries}
			{selectedLineLabel}
			on:toggle={handleToggleSeries}
		/>
	</div>

	{#if rows.length === 0}
		<div class="text-[#f2f6ff]/70 text-xs px-3.5 py-3.5 text-center">No traffic data found for the past month.</div>
	{/if}
</section>
