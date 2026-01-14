<script lang="ts">
	import { onMount } from 'svelte';

	interface DataPoint {
		timestamp: string | Date;
		value: number;
		alert?: {
			id: string;
			message: string;
			severity?: 'warning' | 'critical';
		};
	}

	interface SecondaryDataPoint {
		timestamp: string | Date;
		value: number;
	}

	interface Props {
		/** Primary data series */
		data: DataPoint[];
		/** Secondary data series (optional) - displayed with right Y-axis */
		secondaryData?: SecondaryDataPoint[];
		/** Threshold value - above = red gradient, below = blue gradient */
		threshold?: number;
		/** Label for primary Y-axis */
		primaryLabel?: string;
		/** Label for secondary Y-axis */
		secondaryLabel?: string;
		/** Unit suffix for primary values */
		primaryUnit?: string;
		/** Unit suffix for secondary values */
		secondaryUnit?: string;
		/** Chart height in pixels */
		height?: number;
		/** Show grid lines */
		showGrid?: boolean;
	}

	let {
		data = [],
		secondaryData = [],
		threshold = 0,
		primaryLabel = 'Value',
		secondaryLabel = 'Secondary',
		primaryUnit = '',
		secondaryUnit = '',
		height = 300,
		showGrid = true
	}: Props = $props();

	let chartContainer: HTMLDivElement;
	let width = $state(600);
	let mouseX = $state(0);
	let mouseY = $state(0);
	let tooltipData = $state<{
		primary?: { value: number; timestamp: Date; alert?: DataPoint['alert'] };
		secondary?: { value: number; timestamp: Date };
	} | null>(null);

	// Chart margins
	const margin = { top: 20, right: secondaryData.length > 0 ? 60 : 20, bottom: 60, left: 60 };

	// Calculate chart dimensions
	const chartWidth = $derived(Math.max(0, width - margin.left - margin.right));
	const chartHeight = $derived(Math.max(0, height - margin.top - margin.bottom));

	// Calculate primary Y-axis range
	const primaryMinMax = $derived.by(() => {
		if (data.length === 0) return { min: 0, max: 100 };
		const values = data.map((d) => d.value);
		const min = Math.min(...values, threshold);
		const max = Math.max(...values, threshold);
		const padding = (max - min) * 0.1 || 1;
		return { min: min - padding, max: max + padding };
	});

	// Calculate secondary Y-axis range
	const secondaryMinMax = $derived.by(() => {
		if (secondaryData.length === 0) return { min: 0, max: 100 };
		const values = secondaryData.map((d) => d.value);
		const min = Math.min(...values);
		const max = Math.max(...values);
		const padding = (max - min) * 0.1 || 1;
		return { min: min - padding, max: max + padding };
	});

	// Calculate Y-axis tick values based on range
	function calculateTicks(min: number, max: number): number[] {
		const range = max - min;
		let step: number;

		if (range <= 1) {
			step = 0.1;
		} else if (range <= 5) {
			step = 0.5;
		} else if (range <= 10) {
			step = 1;
		} else if (range <= 50) {
			step = 5;
		} else if (range <= 100) {
			step = 10;
		} else if (range <= 500) {
			step = 50;
		} else {
			step = Math.ceil(range / 10);
		}

		const ticks: number[] = [];
		const start = Math.ceil(min / step) * step;
		for (let i = start; i <= max; i += step) {
			ticks.push(Math.round(i * 100) / 100);
		}
		return ticks;
	}

	const primaryTicks = $derived(calculateTicks(primaryMinMax.min, primaryMinMax.max));
	const secondaryTicks = $derived(calculateTicks(secondaryMinMax.min, secondaryMinMax.max));

	// Calculate X-axis range (timestamps)
	const timeRange = $derived.by(() => {
		const allTimestamps = [
			...data.map((d) => new Date(d.timestamp).getTime()),
			...secondaryData.map((d) => new Date(d.timestamp).getTime())
		];
		if (allTimestamps.length === 0) return { min: Date.now() - 86400000, max: Date.now() };
		return { min: Math.min(...allTimestamps), max: Math.max(...allTimestamps) };
	});

	// Scale functions
	function scaleX(timestamp: string | Date): number {
		const time = new Date(timestamp).getTime();
		const range = timeRange.max - timeRange.min || 1;
		return ((time - timeRange.min) / range) * chartWidth;
	}

	function scalePrimaryY(value: number): number {
		const range = primaryMinMax.max - primaryMinMax.min || 1;
		return chartHeight - ((value - primaryMinMax.min) / range) * chartHeight;
	}

	function scaleSecondaryY(value: number): number {
		const range = secondaryMinMax.max - secondaryMinMax.min || 1;
		return chartHeight - ((value - secondaryMinMax.min) / range) * chartHeight;
	}

	// Generate path for primary data line
	const primaryPath = $derived.by(() => {
		if (data.length === 0) return '';
		return data
			.map((d, i) => {
				const x = scaleX(d.timestamp);
				const y = scalePrimaryY(d.value);
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
	});

	// Generate path for secondary data line
	const secondaryPath = $derived.by(() => {
		if (secondaryData.length === 0) return '';
		return secondaryData
			.map((d, i) => {
				const x = scaleX(d.timestamp);
				const y = scaleSecondaryY(d.value);
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
			})
			.join(' ');
	});

	// Threshold line Y position
	const thresholdLineY = $derived(scalePrimaryY(threshold));

	// X-axis time labels
	const timeLabels = $derived.by(() => {
		const range = timeRange.max - timeRange.min;
		const labelCount = Math.min(8, Math.max(2, Math.floor(chartWidth / 100)));
		const labels: { x: number; label: string }[] = [];

		for (let i = 0; i < labelCount; i++) {
			const time = timeRange.min + (range / (labelCount - 1)) * i;
			const date = new Date(time);
			const x = (i / (labelCount - 1)) * chartWidth;

			// Format based on range
			let label: string;
			if (range < 86400000) {
				// Less than 1 day - show time
				label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
			} else if (range < 604800000) {
				// Less than 1 week - show day and time
				label = date.toLocaleDateString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' });
			} else {
				// More than 1 week - show date
				label = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
			}

			labels.push({ x, label });
		}

		return labels;
	});

	// Alert points
	const alertPoints = $derived(
		data
			.filter((d) => d.alert)
			.map((d) => ({
				x: scaleX(d.timestamp),
				y: scalePrimaryY(d.value),
				alert: d.alert!,
				value: d.value,
				timestamp: new Date(d.timestamp)
			}))
	);

	// Handle mouse move for tooltip
	function handleMouseMove(event: MouseEvent) {
		const rect = chartContainer.getBoundingClientRect();
		const relativeX = event.clientX - rect.left - margin.left;

		// Always update mouse position for tooltip
		mouseX = event.clientX - rect.left;
		mouseY = event.clientY - rect.top;

		if (relativeX < 0 || relativeX > chartWidth) {
			tooltipData = null;
			return;
		}

		// Find closest primary data point
		let closestPrimary: DataPoint | null = null;
		let closestPrimaryDist = Infinity;
		for (const d of data) {
			const x = scaleX(d.timestamp);
			const dist = Math.abs(x - relativeX);
			if (dist < closestPrimaryDist) {
				closestPrimaryDist = dist;
				closestPrimary = d;
			}
		}

		// Find closest secondary data point
		let closestSecondary: SecondaryDataPoint | null = null;
		let closestSecondaryDist = Infinity;
		for (const d of secondaryData) {
			const x = scaleX(d.timestamp);
			const dist = Math.abs(x - relativeX);
			if (dist < closestSecondaryDist) {
				closestSecondaryDist = dist;
				closestSecondary = d;
			}
		}

		if (closestPrimary || closestSecondary) {
			tooltipData = {
				primary: closestPrimary
					? {
							value: closestPrimary.value,
							timestamp: new Date(closestPrimary.timestamp),
							alert: closestPrimary.alert
						}
					: undefined,
				secondary: closestSecondary
					? {
							value: closestSecondary.value,
							timestamp: new Date(closestSecondary.timestamp)
						}
					: undefined
			};
		}
	}

	function handleMouseLeave() {
		tooltipData = null;
	}

	onMount(() => {
		const observer = new ResizeObserver((entries) => {
			for (const entry of entries) {
				width = entry.contentRect.width;
			}
		});
		observer.observe(chartContainer);
		return () => observer.disconnect();
	});
</script>

<div
	bind:this={chartContainer}
	class="relative w-full select-none"
	style="height: {height}px;"
	role="img"
	aria-label="Line chart showing {primaryLabel}{secondaryData.length > 0 ? ` and ${secondaryLabel}` : ''} over time"
	onmousemove={handleMouseMove}
	onmouseleave={handleMouseLeave}
>
	<svg {width} {height} class="overflow-visible">
		<!-- Gradient definitions for line strokes -->
		<defs>
			<!-- Vertical gradient: red at top transitioning through orange/yellow/green to blue at bottom based on Y position -->
			<linearGradient id="lineGradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="{chartHeight}">
				<stop offset="0%" stop-color="rgb(239 68 68)" />
				<stop offset="25%" stop-color="rgb(249 115 22)" />
				<stop offset="50%" stop-color="rgb(234 179 8)" />
				<stop offset="75%" stop-color="rgb(34 197 94)" />
				<stop offset="100%" stop-color="rgb(59 130 246)" />
			</linearGradient>
		</defs>

		<g transform="translate({margin.left}, {margin.top})">
			<!-- Grid lines -->
			{#if showGrid}
				{#each primaryTicks as tick (tick)}
					<line
						x1="0"
						y1={scalePrimaryY(tick)}
						x2={chartWidth}
						y2={scalePrimaryY(tick)}
						stroke="rgb(51 65 85)"
						stroke-width="1"
						stroke-dasharray="4,4"
						opacity="0.5"
					/>
				{/each}
				{#each timeLabels as label (label.x)}
					<line
						x1={label.x}
						y1="0"
						x2={label.x}
						y2={chartHeight}
						stroke="rgb(51 65 85)"
						stroke-width="1"
						stroke-dasharray="4,4"
						opacity="0.5"
					/>
				{/each}
			{/if}

			<!-- Threshold line -->
			<line
				x1="0"
				y1={thresholdLineY}
				x2={chartWidth}
				y2={thresholdLineY}
				stroke="rgb(148 163 184)"
				stroke-width="2"
				stroke-dasharray="6,4"
			/>
			<text
				x={chartWidth + 5}
				y={thresholdLineY}
				fill="rgb(148 163 184)"
				font-size="10"
				dominant-baseline="middle"
			>
				{threshold}{primaryUnit}
			</text>

			<!-- Primary data line with vertical gradient -->
			{#if primaryPath}
				<path 
					d={primaryPath} 
					fill="none" 
					stroke="url(#lineGradient)" 
					stroke-width="3" 
					stroke-linecap="round" 
					stroke-linejoin="round" 
				/>
			{/if}

			<!-- Secondary data line -->
			{#if secondaryPath}
				<path d={secondaryPath} fill="none" stroke="rgb(168 85 247)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6,3" />
			{/if}

			<!-- Data points for primary -->
			{#each data as point, i (i)}
				<circle
					cx={scaleX(point.timestamp)}
					cy={scalePrimaryY(point.value)}
					r="3"
					fill={point.value > threshold ? 'rgb(239 68 68)' : 'rgb(59 130 246)'}
					stroke="rgb(15 23 42)"
					stroke-width="1"
				/>
			{/each}

			<!-- Alert markers -->
			{#each alertPoints as alert (alert.alert.id)}
				<g transform="translate({alert.x}, {alert.y - 20})">
					<circle
						r="10"
						fill={alert.alert.severity === 'critical' ? 'rgb(239 68 68)' : 'rgb(245 158 11)'}
						stroke="rgb(15 23 42)"
						stroke-width="2"
						class="animate-pulse"
					/>
					<text
						y="4"
						fill="white"
						font-size="12"
						font-weight="bold"
						text-anchor="middle"
					>
						!
					</text>
				</g>
			{/each}

			<!-- Primary Y-axis (left) -->
			<g>
				<line x1="0" y1="0" x2="0" y2={chartHeight} stroke="rgb(71 85 105)" stroke-width="1" />
				{#each primaryTicks as tick (tick)}
					<g transform="translate(0, {scalePrimaryY(tick)})">
						<line x1="-5" y1="0" x2="0" y2="0" stroke="rgb(71 85 105)" stroke-width="1" />
						<text x="-10" y="0" fill="rgb(148 163 184)" font-size="11" text-anchor="end" dominant-baseline="middle">
							{tick}{primaryUnit}
						</text>
					</g>
				{/each}
				<!-- Primary Y-axis label -->
				<text
					transform="rotate(-90)"
					x={-chartHeight / 2}
					y="-45"
					fill="rgb(14 165 233)"
					font-size="12"
					font-weight="500"
					text-anchor="middle"
				>
					{primaryLabel}
				</text>
			</g>

			<!-- Secondary Y-axis (right) -->
			{#if secondaryData.length > 0}
				<g transform="translate({chartWidth}, 0)">
					<line x1="0" y1="0" x2="0" y2={chartHeight} stroke="rgb(71 85 105)" stroke-width="1" />
					{#each secondaryTicks as tick (tick)}
						<g transform="translate(0, {scaleSecondaryY(tick)})">
							<line x1="0" y1="0" x2="5" y2="0" stroke="rgb(71 85 105)" stroke-width="1" />
							<text x="10" y="0" fill="rgb(192 132 252)" font-size="11" text-anchor="start" dominant-baseline="middle">
								{tick}{secondaryUnit}
							</text>
						</g>
					{/each}
					<!-- Secondary Y-axis label -->
					<text
						transform="rotate(90)"
						x={chartHeight / 2}
						y="-45"
						fill="rgb(168 85 247)"
						font-size="12"
						font-weight="500"
						text-anchor="middle"
					>
						{secondaryLabel}
					</text>
				</g>
			{/if}

			<!-- X-axis (bottom) -->
			<g transform="translate(0, {chartHeight})">
				<line x1="0" y1="0" x2={chartWidth} y2="0" stroke="rgb(71 85 105)" stroke-width="1" />
				{#each timeLabels as label (label.x)}
					<g transform="translate({label.x}, 0)">
						<line x1="0" y1="0" x2="0" y2="5" stroke="rgb(71 85 105)" stroke-width="1" />
						<text
							x="0"
							y="12"
							fill="rgb(148 163 184)"
							font-size="10"
							text-anchor="end"
							transform="rotate(-45, 0, 12)"
						>
							{label.label}
						</text>
					</g>
				{/each}
			</g>
		</g>
	</svg>

	<!-- Tooltip -->
	{#if tooltipData}
		<div
			class="pointer-events-none absolute z-50 rounded-lg border border-slate-700 bg-slate-800/95 px-3 py-2 text-xs shadow-xl backdrop-blur-sm"
			style="left: {Math.min(mouseX + 15, width - 180)}px; top: {Math.max(10, mouseY - 70)}px;"
		>
			{#if tooltipData.primary}
				<div class="flex items-center gap-2">
					<span class="h-2 w-2 rounded-full bg-sky-500"></span>
					<span class="text-slate-400">{primaryLabel}:</span>
					<span class="font-medium text-white">{tooltipData.primary.value.toFixed(2)}{primaryUnit}</span>
				</div>
				<div class="mt-1 text-slate-500">
					{tooltipData.primary.timestamp.toLocaleString()}
				</div>
				{#if tooltipData.primary.alert}
					<div class="mt-2 flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 text-amber-300">
						<svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
						{tooltipData.primary.alert.message}
					</div>
				{/if}
			{/if}
			{#if tooltipData.secondary}
				<div class="mt-1 flex items-center gap-2">
					<span class="h-2 w-2 rounded-full bg-purple-500"></span>
					<span class="text-slate-400">{secondaryLabel}:</span>
					<span class="font-medium text-white">{tooltipData.secondary.value.toFixed(2)}{secondaryUnit}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Legend -->
	<div class="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs">
		<div class="flex items-center gap-1.5">
			<span class="h-0.5 w-4 rounded bg-sky-500"></span>
			<span class="text-slate-400">{primaryLabel}</span>
		</div>
		{#if secondaryData.length > 0}
			<div class="flex items-center gap-1.5">
				<span class="h-0.5 w-4 rounded bg-purple-500" style="background: repeating-linear-gradient(90deg, rgb(168 85 247), rgb(168 85 247) 4px, transparent 4px, transparent 6px);"></span>
				<span class="text-slate-400">{secondaryLabel}</span>
			</div>
		{/if}
		<div class="flex items-center gap-1.5">
			<span class="h-0.5 w-4 border-t-2 border-dashed border-slate-400"></span>
			<span class="text-slate-400">Threshold ({threshold}{primaryUnit})</span>
		</div>
	</div>
</div>
