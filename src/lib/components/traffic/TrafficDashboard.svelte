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

	const aggregated = $derived.by(() => aggregateRows(rows));
	const availableLines = $derived.by(() =>
		aggregated.lines.length ? aggregated.lines : ['L1']
	);
	const monthOptions = $derived.by(() => buildMonthOptions(currentMonth));

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
	}

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
			const date = new SvelteDate(
				Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1)
			);
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
		return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(
			date.getUTCDate()
		)}`;
	}

	function daysInMonthUTC(year: number, monthIndex: number) {
		return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
	}

	function pad2(value: number) {
		return String(value).padStart(2, '0');
	}
</script>

<section class="traffic-dashboard">
	<header class="traffic-header">
		<div class="traffic-left">
			<div class="traffic-title">Traffic counts · {deviceName}</div>
			<div class="traffic-subtitle">{subtitle}</div>
		</div>
		<div class="traffic-controls">
			<label class="traffic-chip">
				<span>Month</span>
				<select bind:value={month}>
					{#each monthOptions as option (option)}
						<option value={option}>{option}</option>
					{/each}
				</select>
			</label>
			<label class="traffic-chip">
				<span>Line</span>
				<select bind:value={selectedLineOverride}>
					<option value="ALL">All lines</option>
					{#each availableLines as line (line)}
						<option value={line}>{line}</option>
					{/each}
				</select>
			</label>
			<button class="traffic-btn" type="button" onclick={jumpToToday}>Today</button>
		</div>
	</header>

	<div class="traffic-wrap">
		<main class="traffic-main">
			<div class="traffic-main-top">
				<div>
					<h2 class="traffic-h2">{monthLabel} · Daily totals</h2>
					<div class="traffic-hint">Daily totals shown per day cell. UTC hours.</div>
				</div>
				<div class="traffic-legend">
					{#each CLASSES as klass (klass.key)}
						<div class="traffic-legend-item">
							<span class="traffic-pill">{klass.short}</span>
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
			hiddenSeries={hiddenSeries}
			selectedLineLabel={selectedLineLabel}
			on:toggle={handleToggleSeries}
		/>
	</div>

	{#if rows.length === 0}
		<div class="traffic-muted traffic-empty">
			No traffic data found for the past month.
		</div>
	{/if}
</section>

<style>
	:global(.traffic-dashboard) {
		--traffic-bg0: #070b14;
		--traffic-bg1: #0b1220;
		--traffic-panel: #0e1a33;
		--traffic-panel2: #101c38;
		--traffic-card: #16244a;
		--traffic-card2: #0f1a34;
		--traffic-muted: #b6c2d6;
		--traffic-text: #f2f6ff;
		--traffic-line: rgba(255, 255, 255, 0.14);
		--traffic-line2: rgba(255, 255, 255, 0.1);
		--traffic-accent: #7db8ff;
		--traffic-accent2: #52e3b1;
		--traffic-shadow: 0 10px 28px rgba(0, 0, 0, 0.35);
	}

	.traffic-dashboard {
		border-radius: 24px;
		border: 1px solid var(--traffic-line);
		background: radial-gradient(1200px 700px at 20% 0%, #111f44 0%, transparent 55%),
			radial-gradient(900px 600px at 90% 15%, #0f2a4a 0%, transparent 60%),
			linear-gradient(180deg, var(--traffic-bg0), var(--traffic-bg1));
		color: var(--traffic-text);
		box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
		overflow: hidden;
	}

	.traffic-header {
		padding: 14px 16px;
		border-bottom: 1px solid var(--traffic-line);
		background: rgba(14, 26, 51, 0.78);
		backdrop-filter: blur(10px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
		display: flex;
		gap: 12px;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.traffic-left {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.traffic-title {
		font-weight: 800;
		letter-spacing: 0.2px;
	}

	.traffic-subtitle {
		color: rgba(242, 246, 255, 0.72);
		font-size: 12px;
	}

	.traffic-controls {
		display: flex;
		gap: 10px;
		align-items: center;
		flex-wrap: wrap;
	}

	.traffic-chip {
		padding: 6px 10px;
		border: 1px solid var(--traffic-line);
		border-radius: 999px;
		background: rgba(22, 36, 74, 0.8);
		color: var(--traffic-text);
		font-size: 12px;
		display: flex;
		align-items: center;
		gap: 8px;
		user-select: none;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
	}

	.traffic-chip select {
		appearance: none;
		background: transparent;
		border: none;
		color: var(--traffic-text);
		font: inherit;
		outline: none;
		cursor: pointer;
	}

	.traffic-btn {
		padding: 8px 12px;
		border-radius: 10px;
		border: 1px solid var(--traffic-line);
		background: rgba(22, 36, 74, 0.85);
		color: var(--traffic-text);
		font-size: 12px;
		cursor: pointer;
		user-select: none;
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
	}

	.traffic-btn:hover {
		border-color: rgba(125, 184, 255, 0.9);
	}

	.traffic-wrap {
		display: grid;
		grid-template-columns: 1.8fr 1fr;
		min-height: 0;
	}

	.traffic-main {
		padding: 14px;
		min-width: 0;
		min-height: 0;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.traffic-main-top {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.traffic-h2 {
		font-weight: 800;
		font-size: 14px;
		letter-spacing: 0.2px;
		margin: 0;
	}

	.traffic-hint {
		color: rgba(242, 246, 255, 0.72);
		font-size: 12px;
		margin-top: 4px;
	}

	.traffic-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 8px 10px;
		align-items: center;
		padding: 10px 12px;
		border-radius: 14px;
		background: rgba(22, 36, 74, 0.78);
		border: 1px solid var(--traffic-line);
		box-shadow: var(--traffic-shadow);
		max-width: 100%;
	}

	.traffic-legend-item {
		display: flex;
		gap: 8px;
		align-items: center;
		color: rgba(242, 246, 255, 0.82);
		font-size: 12px;
		white-space: nowrap;
	}

	.traffic-pill {
		min-width: 34px;
		padding: 2px 7px;
		border-radius: 999px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid var(--traffic-line2);
		color: var(--traffic-text);
		font-weight: 800;
		font-size: 12px;
		text-align: center;
	}

	.traffic-empty {
		padding: 14px 16px;
		text-align: center;
	}

	.traffic-muted {
		color: rgba(242, 246, 255, 0.72);
		font-size: 12px;
	}

	@media (max-width: 980px) {
		.traffic-wrap {
			grid-template-columns: 1fr;
		}
	}
</style>
