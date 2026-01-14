<script lang="ts">
	import CWDateRangePicker, { type DateRangeValue } from './CWDateRangePicker.svelte';
	import { DateTime } from 'luxon';
	import { fade } from 'svelte/transition';

	type HeatmapPoint = { label: string; value: number; alert?: boolean; className?: string };
	type HeatmapMetric = {
		key: string;
		label: string;
		unit: string;
		palette?: string[];
		points: HeatmapPoint[];
	};

	let {
		title = 'Thermal footprint',
		subtitle = '',
		description = 'Each cell represents a reading over time. Colors indicate deviation from the average — blue is below average, red is above.',
		dateRange = { start: DateTime.now().startOf('day').toJSDate(), end: new Date() },
		metrics
	}: {
		title?: string;
		subtitle?: string;
		description?: string;
		dateRange?: DateRangeValue;
		metrics: Record<string, HeatmapMetric>;
	} = $props();

	let selectedMetric = $state(Object.keys(metrics ?? {})[0] ?? '');
	let hoveredIndex = $state<number | null>(null);
	let showHelp = $state(false);
	let focusedIndex = $state<number | null>(null);

	const metricEntries = $derived.by(() => Object.entries(metrics ?? {}));

	const activeMetric = $derived.by(
		() => (selectedMetric && metrics?.[selectedMetric]) || metricEntries[0]?.[1]
	);

	const activeValues = $derived.by(() => activeMetric?.points?.map((point) => point.value) ?? []);

	const scale = $derived.by(() => {
		if (!activeValues.length) return { min: 0, max: 0, avg: 0, range: 1 };
		const min = Math.min(...activeValues);
		const max = Math.max(...activeValues);
		const avg = activeValues.reduce((sum, v) => sum + v, 0) / activeValues.length;
		return { min, max, avg, range: Math.max(1, max - min) };
	});

	// Compute a blue-to-red color based on deviation from the average.
	// Values at avg are neutral slate/gray, colder skews toward blue, warmer skews toward red.
	function tempToColor(value: number, min: number, max: number, avg: number): string {
		const range = Math.max(1, max - min);
		// -1 = coldest, 0 = avg, +1 = hottest
		const deviation = (value - avg) / (range / 2);
		const clamped = Math.max(-1, Math.min(1, deviation));

		// Blend from blue (#3b82f6) through neutral (#475569) to red (#ef4444)
		let r: number, g: number, b: number;
		if (clamped <= 0) {
			// cold → neutral
			const t = clamped + 1; // 0 = blue, 1 = neutral
			r = Math.round(59 + t * (71 - 59));
			g = Math.round(130 + t * (85 - 130));
			b = Math.round(246 + t * (105 - 246));
		} else {
			// neutral → hot
			const t = clamped; // 0 = neutral, 1 = red
			r = Math.round(71 + t * (239 - 71));
			g = Math.round(85 + t * (68 - 85));
			b = Math.round(105 + t * (68 - 105));
		}
		return `rgb(${r}, ${g}, ${b})`;
	}

	const heatmapData = $derived.by(() => {
		if (!activeMetric) return [];
		return activeMetric.points.map((point) => {
			const color = tempToColor(point.value, scale.min, scale.max, scale.avg);
			// Parse the label to extract date/time info
			const dt = DateTime.fromISO(point.label);
			const isValidDate = dt.isValid;
			return { 
				...point, 
				color,
				dateTime: isValidDate ? dt : null,
				hour: isValidDate ? dt.hour : null,
				day: isValidDate ? dt.toFormat('ccc') : null, // Mon, Tue, etc.
				dayNum: isValidDate ? dt.day : null,
				month: isValidDate ? dt.toFormat('MMM') : null,
				formattedTime: isValidDate ? dt.toFormat('HH:mm') : point.label,
				formattedDate: isValidDate ? dt.toFormat('MMM d') : point.label
			};
		});
	});

	// Organize data into a grid: rows = days, columns = hours
	const gridData = $derived.by(() => {
		if (!heatmapData.length) return { rows: [], hours: [], days: [] };
		
		// Check if we have valid date/time data
		const hasDateData = heatmapData.some(d => d.dateTime !== null);
		
		if (!hasDateData) {
			// Fallback: single row with all data
			return {
				rows: [heatmapData],
				hours: Array.from({ length: Math.min(24, heatmapData.length) }, (_, i) => i),
				days: ['Data'],
				hasTimeAxis: false
			};
		}
		
		// Group by date (day)
		const byDay = new Map<string, typeof heatmapData>();
		const dayOrder: string[] = [];
		
		for (const point of heatmapData) {
			if (!point.dateTime) continue;
			const dayKey = point.dateTime.toFormat('yyyy-MM-dd');
			if (!byDay.has(dayKey)) {
				byDay.set(dayKey, []);
				dayOrder.push(dayKey);
			}
			byDay.get(dayKey)!.push(point);
		}
		
		// Get unique hours across all data
		const allHours = new Set<number>();
		for (const point of heatmapData) {
			if (point.hour !== null) allHours.add(point.hour);
		}
		const hours = Array.from(allHours).sort((a, b) => a - b);
		
		// Build rows: each row is a day, each column is an hour
		const rows: (typeof heatmapData[0] | null)[][] = [];
		const days: string[] = [];
		
		for (const dayKey of dayOrder) {
			const dayPoints = byDay.get(dayKey)!;
			const dt = DateTime.fromISO(dayKey);
			days.push(dt.toFormat('ccc d')); // "Mon 2", "Tue 3", etc.
			
			// Create a row with slots for each hour
			const row: (typeof heatmapData[0] | null)[] = [];
			for (const hour of hours) {
				const point = dayPoints.find(p => p.hour === hour);
				row.push(point ?? null);
			}
			rows.push(row);
		}
		
		return { rows, hours, days, hasTimeAxis: true };
	});

	const xTicks = $derived.by(() => {
		const len = activeMetric?.points?.length ?? 0;
		if (!len) return [];
		const count = Math.min(6, len);
		return Array.from({ length: count }, (_, i) => Math.round((len - 1) * (i / (count - 1))));
	});

	// Generate legend swatches from cold → avg → hot
	const legendSwatches = $derived.by(() => {
		const steps = 7;
		const swatches: string[] = [];
		for (let i = 0; i < steps; i++) {
			const t = i / (steps - 1);
			const val = scale.min + t * scale.range;
			swatches.push(tempToColor(val, scale.min, scale.max, scale.avg));
		}
		return swatches;
	});

	// Selected cell for the info panel
	const selectedCell = $derived.by(() => {
		const idx = hoveredIndex ?? focusedIndex;
		if (idx === null) return null;
		
		// Find the cell in gridData
		let cellCount = 0;
		for (let rowIdx = 0; rowIdx < gridData.rows.length; rowIdx++) {
			for (let colIdx = 0; colIdx < gridData.rows[rowIdx].length; colIdx++) {
				const cell = gridData.rows[rowIdx][colIdx];
				if (cell) {
					if (cellCount === idx) {
						return { ...cell, index: idx, rowIdx, colIdx };
					}
					cellCount++;
				}
			}
		}
		return null;
	});

	// Total cell count for display
	const totalCells = $derived.by(() => {
		return gridData.rows.reduce((sum, row) => sum + row.filter(c => c !== null).length, 0);
	});

	// Keyboard navigation handler
	function handleKeydown(e: KeyboardEvent, currentIdx: number, rowIdx: number, colIdx: number) {
		const numRows = gridData.rows.length;
		const numCols = gridData.hours.length;
		if (!numRows || !numCols) return;
		
		let newRowIdx = rowIdx;
		let newColIdx = colIdx;
		
		switch(e.key) {
			case 'ArrowRight':
				newColIdx = Math.min(colIdx + 1, numCols - 1);
				break;
			case 'ArrowLeft':
				newColIdx = Math.max(colIdx - 1, 0);
				break;
			case 'ArrowDown':
				newRowIdx = Math.min(rowIdx + 1, numRows - 1);
				break;
			case 'ArrowUp':
				newRowIdx = Math.max(rowIdx - 1, 0);
				break;
			case 'Home':
				newRowIdx = 0;
				newColIdx = 0;
				break;
			case 'End':
				newRowIdx = numRows - 1;
				newColIdx = numCols - 1;
				break;
			default:
				return;
		}
		e.preventDefault();
		
		// Find the cell at new position and focus it
		const cellId = `cell-${newRowIdx}-${newColIdx}`;
		const cell = document.getElementById(cellId);
		if (cell) {
			cell.focus();
		}
	}
</script>

<section class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/40">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div class="flex items-center gap-3">
			<div>
				<p class="text-xs uppercase tracking-[0.15em] text-slate-400">{title}</p>
				{#if subtitle}
					<h2 class="text-xl font-semibold text-white">{subtitle}</h2>
				{/if}
			</div>
			<!-- Help button -->
			<button
				type="button"
				class="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
				onclick={() => showHelp = !showHelp}
				aria-label={showHelp ? 'Hide help' : 'Show help'}
				aria-expanded={showHelp}
			>
				<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
			</button>
		</div>

		{#if metricEntries.length}
			<div class="flex flex-wrap items-center gap-3">
				<label
					class="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 px-4 py-2 text-sm text-slate-200"
				>
					<span class="text-xs uppercase tracking-wide text-slate-400">Range</span>
					<CWDateRangePicker maxDate={new Date()} bind:value={dateRange} />
				</label>
				<div class="flex overflow-hidden rounded-full border border-slate-600">
					{#each metricEntries as [key, metric] (key)}
						<label
							class={`cursor-pointer px-4 py-2 text-sm font-medium transition ${
								selectedMetric === key ? 'bg-slate-700 text-white' : 'bg-transparent text-slate-400'
							}`}
						>
							<input class="sr-only" type="radio" value={key} bind:group={selectedMetric} />
							{metric.label}
						</label>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Help/Info Panel -->
	{#if showHelp}
		<div 
			class="mt-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4"
			transition:fade={{ duration: 150 }}
		>
			<div class="flex items-start gap-3">
				<div class="rounded-lg bg-blue-500/20 p-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				</div>
				<div class="flex-1">
					<h3 class="text-sm font-medium text-white">How to read this heatmap</h3>
					<p class="mt-1 text-sm text-slate-400">{description}</p>
					<ul class="mt-3 space-y-2 text-sm text-slate-400">
						<li class="flex items-center gap-2">
							<span class="h-3 w-3 rounded-sm bg-sky-500"></span>
							<span><strong class="text-sky-400">Blue cells</strong> = values below average (cooler)</span>
						</li>
						<li class="flex items-center gap-2">
							<span class="h-3 w-3 rounded-sm bg-slate-500"></span>
							<span><strong class="text-slate-300">Gray cells</strong> = values near average</span>
						</li>
						<li class="flex items-center gap-2">
							<span class="h-3 w-3 rounded-sm bg-rose-500"></span>
							<span><strong class="text-rose-400">Red cells</strong> = values above average (warmer)</span>
						</li>
						<li class="flex items-center gap-2">
							<span class="h-3 w-3 rounded-sm ring-2 ring-amber-400"></span>
							<span><strong class="text-amber-400">Outlined cells</strong> = alerts triggered</span>
						</li>
					</ul>
					<p class="mt-3 text-xs text-slate-400">
						<strong>Tip:</strong> Hover over any cell to see the exact value. Use arrow keys to navigate between cells.
					</p>
				</div>
				<button 
					type="button"
					class="text-slate-400 hover:text-slate-200" 
					onclick={() => showHelp = false}
					aria-label="Close help"
				>
					<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>
	{/if}

	{#if activeMetric && heatmapData.length}
		<div class="mt-6 flex flex-col gap-4">
			<!-- Selected cell info panel - fixed height to prevent jumping -->
			<div class="h-[72px]">
				{#if selectedCell}
					<div 
						class="flex h-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3"
					>
						<div class="flex items-center gap-4">
							<div 
								class="h-8 w-8 flex-shrink-0 rounded-lg shadow-lg" 
								style="background-color: {selectedCell.color};"
							></div>
							<div>
								<p class="text-sm font-medium text-white">
									{#if selectedCell.dateTime}
										{selectedCell.dateTime.toFormat('ccc, MMM d')} at {selectedCell.formattedTime}
									{:else}
										{selectedCell.label}
									{/if}
								</p>
								<p class="text-xs text-slate-400">Reading #{selectedCell.index + 1} of {totalCells}</p>
							</div>
						</div>
						<div class="text-right">
							<p class="text-2xl font-bold text-white">{selectedCell.value.toFixed(1)}<span class="text-sm font-normal text-slate-400">{activeMetric.unit}</span></p>
							<p class="text-xs text-slate-400">
								{#if selectedCell.value < scale.avg}
									<span class="text-sky-400">▼ {(scale.avg - selectedCell.value).toFixed(1)} below avg</span>
								{:else if selectedCell.value > scale.avg}
									<span class="text-rose-400">▲ {(selectedCell.value - scale.avg).toFixed(1)} above avg</span>
								{:else}
									<span class="text-slate-400">At average</span>
								{/if}
							</p>
						</div>
						{#if selectedCell.alert}
							<div class="ml-4 flex items-center gap-2 rounded-lg bg-amber-500/20 px-3 py-1.5 text-amber-400">
								<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
									<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
								<span class="text-sm font-medium">Alert</span>
							</div>
						{/if}
					</div>
				{:else}
					<div class="flex h-full items-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-800/30 px-4 py-3 text-slate-400">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
						</svg>
						<span class="text-sm">Hover over a cell to see details, or use arrow keys to navigate</span>
					</div>
				{/if}
			</div>

			<div class="flex items-stretch gap-3">
				<!-- Heatmap with day/hour axes -->
				<div class="flex flex-1 flex-col">
					<!-- Hour labels (X-axis) at top -->
					{#if gridData.hasTimeAxis && gridData.hours.length > 0}
						<div class="mb-1 flex" style="padding-left: 52px;">
							<div 
								class="grid flex-1 gap-[2px]" 
								style="grid-template-columns: repeat({gridData.hours.length}, minmax(20px, 1fr));"
							>
								{#each gridData.hours as hour}
									<div class="text-center text-[10px] text-slate-400">
										{hour.toString().padStart(2, '0')}
									</div>
								{/each}
							</div>
						</div>
						<div class="mb-2 text-center text-[10px] text-slate-400" style="padding-left: 52px;">
							Hour of day
						</div>
					{/if}

					<!-- Grid with day labels -->
					<div class="flex">
						<!-- Day labels (Y-axis) on left -->
						{#if gridData.hasTimeAxis}
							<div class="flex w-[48px] flex-shrink-0 flex-col gap-[2px] pr-1">
								{#each gridData.days as day}
									<div 
										class="flex h-[24px] items-center justify-end text-[10px] font-medium text-slate-400"
									>
										{day}
									</div>
								{/each}
							</div>
						{/if}

						<!-- Heatmap Grid -->
						<div
							class="heatmap-container flex-1 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70 p-2"
							role="grid"
							aria-label="Heatmap showing {activeMetric.label} values by day and hour"
						>
							{#each gridData.rows as row, rowIdx}
								<div 
									class="grid gap-[2px]" 
									style="grid-template-columns: repeat({gridData.hours.length || row.length}, minmax(20px, 1fr));"
									role="row"
								>
									{#each row as cell, colIdx}
										{@const cellIdx = (() => {
											let count = 0;
											for (let r = 0; r < rowIdx; r++) {
												count += gridData.rows[r].filter(c => c !== null).length;
											}
											for (let c = 0; c < colIdx; c++) {
												if (gridData.rows[rowIdx][c] !== null) count++;
											}
											return count;
										})()}
										{#if cell}
											<div
												id="cell-{rowIdx}-{colIdx}"
												class={[
													'heatmap-cell relative flex h-[24px] cursor-pointer items-center justify-center rounded-sm outline-none',
													cell.alert ? 'ring-2 ring-amber-400' : '',
													(hoveredIndex === cellIdx || focusedIndex === cellIdx) ? 'hovered' : ''
												]}
												style="background-color: {cell.color};"
												role="gridcell"
												tabindex={(rowIdx === 0 && colIdx === 0) ? 0 : -1}
												aria-label="{cell.formattedDate} {cell.formattedTime}: {cell.value.toFixed(1)}{activeMetric.unit}{cell.alert ? ', alert triggered' : ''}"
												onmouseenter={() => hoveredIndex = cellIdx}
												onmouseleave={() => hoveredIndex = null}
												onfocus={() => focusedIndex = cellIdx}
												onblur={() => focusedIndex = null}
												onkeydown={(e) => handleKeydown(e, cellIdx, rowIdx, colIdx)}
											>
												<span class="cell-value text-[9px] font-semibold text-white drop-shadow-md">
													{cell.value.toFixed(1)}
												</span>
											</div>
										{:else}
											<div 
												class="h-[24px] rounded-sm bg-slate-800/50"
												role="gridcell"
												aria-label="No data"
											></div>
										{/if}
									{/each}
								</div>
								{#if rowIdx < gridData.rows.length - 1}
									<div class="h-[2px]"></div>
								{/if}
							{/each}
						</div>
					</div>
				</div>

				<!-- Legend -->
				<div
					class="flex w-20 flex-col items-center justify-between gap-1 text-[10px] text-slate-300"
				>
					<div class="flex items-center gap-1">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
						</svg>
						<span class="text-xs font-medium text-rose-400">Above Avg</span>
					</div>
					<div
						class="flex w-full flex-1 flex-col overflow-hidden rounded border border-slate-700 shadow-inner"
					>
						{#each [...legendSwatches].reverse() as color, i (color + i)}
							<span class="flex-1" style="background-color: {color};"></span>
						{/each}
					</div>
					<div class="flex items-center gap-1">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
						</svg>
						<span class="text-xs font-medium text-sky-400">Below Avg</span>
					</div>
					<div class="mt-2 w-full space-y-1 rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-center">
						<div class="flex items-center justify-between text-[11px]">
							<span class="text-slate-400">Max</span>
							<span class="font-medium text-rose-300">{scale.max.toFixed(1)}{activeMetric.unit}</span>
						</div>
						<div class="flex items-center justify-between text-[11px]">
							<span class="text-slate-400">Avg</span>
							<span class="font-medium text-slate-300">{scale.avg.toFixed(1)}{activeMetric.unit}</span>
						</div>
						<div class="flex items-center justify-between text-[11px]">
							<span class="text-slate-400">Min</span>
							<span class="font-medium text-sky-300">{scale.min.toFixed(1)}{activeMetric.unit}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Summary info -->
			<div class="flex items-center justify-between text-[11px] text-slate-400">
				<span>{gridData.days.length} day{gridData.days.length !== 1 ? 's' : ''}</span>
				<span>•</span>
				<span>{gridData.hours.length} hour{gridData.hours.length !== 1 ? 's' : ''} per day</span>
				<span>•</span>
				<span>{totalCells} total readings</span>
			</div>
		</div>
	{:else}
		<p class="mt-4 text-sm text-slate-400">No data available.</p>
	{/if}
</section>

<style>
	.heatmap-cell {
		transition: box-shadow 0.15s ease, outline 0.15s ease;
	}

	.heatmap-cell:focus-visible {
		outline: 2px solid rgb(99, 102, 241);
		outline-offset: 1px;
		z-index: 10;
	}

	.heatmap-cell.hovered {
		box-shadow: 0 0 0 2px rgb(255, 255, 255), 0 4px 12px rgba(0, 0, 0, 0.4);
		z-index: 10;
	}

	.cell-value {
		opacity: 0;
		transition: opacity 0.15s ease;
	}

	.heatmap-cell.hovered .cell-value,
	.heatmap-cell:focus-visible .cell-value {
		opacity: 1;
	}
</style>
