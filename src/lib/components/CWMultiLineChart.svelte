<script lang="ts">
	import { onMount } from 'svelte';

	interface DataSeries {
		id: string;
		name: string;
		color: string;
		data: Array<{
			timestamp: Date;
			value: number;
		}>;
	}

	interface Props {
		series: DataSeries[];
		height?: number;
		unit?: string;
		showLegend?: boolean;
		class?: string;
	}

	let {
		series = [],
		height = 300,
		unit = '',
		showLegend = true,
		class: className = ''
	}: Props = $props();

	let containerRef: HTMLDivElement | null = null;
	let svgWidth = $state(600);
	let hoveredPoint = $state<{
		x: number;
		y: number;
		timestamp: Date;
		values: Array<{ name: string; value: number; color: string }>;
	} | null>(null);

	const PADDING = { top: 20, right: 20, bottom: 40, left: 60 };
	
	// High-contrast color palette - carefully chosen for maximum visual distinction
	const COLORS = [
		'#ef4444', // red-500
		'#22c55e', // green-500
		'#3b82f6', // blue-500
		'#f59e0b', // amber-500
		'#8b5cf6', // violet-500
		'#06b6d4', // cyan-500
		'#ec4899', // pink-500
		'#84cc16', // lime-500
		'#f97316', // orange-500
		'#6366f1', // indigo-500
		'#14b8a6', // teal-500
		'#a855f7', // purple-500
	];

	const chartWidth = $derived(svgWidth - PADDING.left - PADDING.right);
	const chartHeight = $derived(height - PADDING.top - PADDING.bottom);

	const allPoints = $derived(series.flatMap((s) => s.data));

	const minTime = $derived(
		allPoints.length > 0 ? Math.min(...allPoints.map((p) => p.timestamp.getTime())) : 0
	);
	const maxTime = $derived(
		allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.timestamp.getTime())) : 1
	);

	const minValue = $derived(
		allPoints.length > 0 ? Math.min(...allPoints.map((p) => p.value)) : 0
	);
	const maxValue = $derived(
		allPoints.length > 0 ? Math.max(...allPoints.map((p) => p.value)) : 1
	);

	// Add padding to min/max values
	const valuePadding = $derived((maxValue - minValue) * 0.1 || 1);
	const adjustedMin = $derived(minValue - valuePadding);
	const adjustedMax = $derived(maxValue + valuePadding);

	function scaleX(timestamp: Date): number {
		const range = maxTime - minTime || 1;
		return PADDING.left + ((timestamp.getTime() - minTime) / range) * chartWidth;
	}

	function scaleY(value: number): number {
		const range = adjustedMax - adjustedMin || 1;
		return PADDING.top + chartHeight - ((value - adjustedMin) / range) * chartHeight;
	}

	function generatePath(data: Array<{ timestamp: Date; value: number }>): string {
		if (data.length === 0) return '';
		const sorted = [...data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
		return sorted
			.map((point, i) => {
				const x = scaleX(point.timestamp);
				const y = scaleY(point.value);
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
	}

	const yTicks = $derived.by(() => {
		const tickCount = 5;
		const range = adjustedMax - adjustedMin;
		const step = range / (tickCount - 1);
		return Array.from({ length: tickCount }, (_, i) => adjustedMin + step * i);
	});

	const xTicks = $derived.by(() => {
		if (allPoints.length === 0) return [];
		const tickCount = Math.min(6, Math.ceil(chartWidth / 100));
		const range = maxTime - minTime;
		const step = range / (tickCount - 1);
		return Array.from({ length: tickCount }, (_, i) => new Date(minTime + step * i));
	});

	function formatDate(date: Date): string {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	}

	function formatTooltipDate(date: Date): string {
		return date.toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function handleMouseMove(event: MouseEvent) {
		if (!containerRef || allPoints.length === 0) return;

		const rect = containerRef.getBoundingClientRect();
		const x = event.clientX - rect.left;
		const y = event.clientY - rect.top;

		if (x < PADDING.left || x > svgWidth - PADDING.right) {
			hoveredPoint = null;
			return;
		}

		// Find closest timestamp
		const mouseTime = minTime + ((x - PADDING.left) / chartWidth) * (maxTime - minTime);
		
		// Get values from each series at this timestamp
		const values: Array<{ name: string; value: number; color: string }> = [];
		
		for (const s of series) {
			if (s.data.length === 0) continue;
			const sorted = [...s.data].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
			
			// Find closest point
			let closest = sorted[0];
			let closestDiff = Math.abs(sorted[0].timestamp.getTime() - mouseTime);
			
			for (const point of sorted) {
				const diff = Math.abs(point.timestamp.getTime() - mouseTime);
				if (diff < closestDiff) {
					closestDiff = diff;
					closest = point;
				}
			}
			
			values.push({
				name: s.name,
				value: closest.value,
				color: s.color || COLORS[series.indexOf(s) % COLORS.length]
			});
		}

		hoveredPoint = {
			x: Math.min(Math.max(x, 100), svgWidth - 150),
			y: Math.min(Math.max(y, 20), height - 100),
			timestamp: new Date(mouseTime),
			values
		};
	}

	function handleMouseLeave() {
		hoveredPoint = null;
	}

	onMount(() => {
		if (containerRef) {
			const observer = new ResizeObserver((entries) => {
				for (const entry of entries) {
					svgWidth = entry.contentRect.width;
				}
			});
			observer.observe(containerRef);
			return () => observer.disconnect();
		}
	});

	// Assign colors to series that don't have one
	const coloredSeries = $derived(
		series.map((s, i) => ({
			...s,
			color: s.color || COLORS[i % COLORS.length]
		}))
	);
</script>

<div class={`rounded-2xl border border-slate-700 bg-slate-900/50 p-4 ${className}`}>
	{#if showLegend && coloredSeries.length > 0}
		<div class="mb-4 flex flex-wrap gap-4">
			{#each coloredSeries as s (s.id)}
				<div class="flex items-center gap-2">
					<span
						class="h-3 w-3 rounded-full"
						style="background-color: {s.color}"
					></span>
					<span class="text-sm text-slate-300">{s.name}</span>
				</div>
			{/each}
		</div>
	{/if}

	<div
		bind:this={containerRef}
		class="relative"
		role="img"
		aria-label="Multi-line comparison chart"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
	>
		{#if series.length === 0 || allPoints.length === 0}
			<div
				class="flex items-center justify-center text-sm text-slate-400"
				style="height: {height}px"
			>
				<p>Select devices and a date range to view data</p>
			</div>
		{:else}
			<svg width="100%" height={height} class="overflow-visible">
				<!-- Grid lines -->
				<g class="grid-lines">
					{#each yTicks as tick, i (i)}
						<line
							x1={PADDING.left}
							y1={scaleY(tick)}
							x2={svgWidth - PADDING.right}
							y2={scaleY(tick)}
							stroke="currentColor"
							stroke-opacity="0.1"
							stroke-dasharray="4"
							class="text-slate-500"
						/>
					{/each}
				</g>

				<!-- Y-axis labels -->
				<g class="y-axis">
					{#each yTicks as tick, i (i)}
						<text
							x={PADDING.left - 10}
							y={scaleY(tick)}
							text-anchor="end"
							dominant-baseline="middle"
							class="fill-slate-400 text-xs"
						>
							{tick.toFixed(1)}{unit}
						</text>
					{/each}
				</g>

				<!-- X-axis labels -->
				<g class="x-axis">
					{#each xTicks as tick, i (i)}
						<text
							x={scaleX(tick)}
							y={height - 10}
							text-anchor="middle"
							class="fill-slate-400 text-xs"
						>
							{i === 0 || formatDate(tick) !== formatDate(xTicks[i - 1])
								? formatDate(tick)
								: formatTime(tick)}
						</text>
					{/each}
				</g>

				<!-- Data lines -->
				{#each coloredSeries as s (s.id)}
					<path
						d={generatePath(s.data)}
						fill="none"
						stroke={s.color}
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="transition-opacity duration-200"
					/>
				{/each}

				<!-- Data points -->
				{#each coloredSeries as s (s.id)}
					{#each s.data as point, i (i)}
						<circle
							cx={scaleX(point.timestamp)}
							cy={scaleY(point.value)}
							r="3"
							fill={s.color}
							class="transition-all duration-200 hover:r-5"
						/>
					{/each}
				{/each}
			</svg>

			<!-- Tooltip -->
			{#if hoveredPoint}
				<div
					class="pointer-events-none absolute z-10 min-w-[160px] rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 shadow-lg"
					style="left: {hoveredPoint.x}px; top: {hoveredPoint.y}px; transform: translate(-50%, -110%)"
				>
					<p class="mb-1 text-xs text-slate-400">{formatTooltipDate(hoveredPoint.timestamp)}</p>
					{#each hoveredPoint.values as v, i (i)}
						<div class="flex items-center justify-between gap-3">
							<span class="flex items-center gap-1.5">
								<span class="h-2 w-2 rounded-full" style="background-color: {v.color}"></span>
								<span class="text-xs text-slate-300">{v.name}</span>
							</span>
							<span class="text-xs font-medium text-slate-100">{v.value.toFixed(1)}{unit}</span>
						</div>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
