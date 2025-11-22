<script lang="ts">
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';

	type HeatmapDatum = {
		x: string;
		y: string;
		value: number;
	};

	type HeatmapProps = {
		data?: HeatmapDatum[];
		xLabels?: string[];
		yLabels?: string[];
		width?: number;
		height?: number;
		padding?: number;
		minValue?: number;
		maxValue?: number;
		colorStops?: string[];
		showGrid?: boolean;
		showLabels?: boolean;
		valueFormatter?: (value: number | undefined) => string;
	};

	const defaultFormatter = (value: number | undefined) =>
		value === undefined || Number.isNaN(value) ? '–' : value.toString();

	let {
		data = [],
		xLabels,
		yLabels,
		width = 640,
		height = 400,
		padding = 32,
		minValue,
		maxValue,
		colorStops = ['#f5f5f5', '#2563eb'],
		showGrid = true,
		showLabels = true,
		valueFormatter = defaultFormatter
	}: HeatmapProps = $props();

	const xDomain = $derived.by(() => {
		if (xLabels?.length) return xLabels;
		const labels = new SvelteSet<string>();
		for (const point of data) labels.add(point.x);
		return Array.from(labels);
	});

	const yDomain = $derived.by(() => {
		if (yLabels?.length) return yLabels;
		const labels = new SvelteSet<string>();
		for (const point of data) labels.add(point.y);
		return Array.from(labels);
	});

	const valueMap = $derived.by(() => {
		const map = new SvelteMap<string, number>();
		for (const { x, y, value } of data) {
			map.set(`${x}__${y}`, value);
		}
		return map;
	});

	const min = $derived.by(() => {
		if (typeof minValue === 'number') return minValue;
		let current = Infinity;
		for (const point of data) {
			if (point.value < current) current = point.value;
		}
		return current === Infinity ? 0 : current;
	});

	const max = $derived.by(() => {
		if (typeof maxValue === 'number') return maxValue;
		let current = -Infinity;
		for (const point of data) {
			if (point.value > current) current = point.value;
		}
		if (current === -Infinity) return min + 1;
		return current === min ? current + 1 : current;
	});

	const range = $derived(Math.max(1, max - min));

	const innerWidth = $derived(Math.max(0, width - padding * 2));
	const innerHeight = $derived(Math.max(0, height - padding * 2));

	const cellWidth = $derived(xDomain.length ? innerWidth / xDomain.length : 0);
	const cellHeight = $derived(yDomain.length ? innerHeight / yDomain.length : 0);

	const labelFontSize = $derived(
		Math.max(10, Math.min(14, Math.min(cellWidth, cellHeight) * 0.35 || 12))
	);

	const gridColor = 'var(--heatmap-grid-color, rgba(148, 163, 184, 0.4))';
	const labelColor = 'var(--heatmap-label-color, #374151)';

	const viewBox = $derived(`0 0 ${width} ${height}`);

	const parseHex = (hex: string) => {
		let value = hex.replace('#', '').trim();
		if (value.length === 3) {
			value = value
				.split('')
				.map((c) => c + c)
				.join('');
		}
		const num = Number.parseInt(value, 16);
		if (Number.isNaN(num) || value.length !== 6) {
			return { r: 0, g: 0, b: 0 };
		}
		return {
			r: (num >> 16) & 255,
			g: (num >> 8) & 255,
			b: num & 255
		};
	};

	const interpolateColor = (stops: string[], t: number) => {
		if (stops.length === 0) return '#000000';
		if (stops.length === 1) return stops[0];
		const scaled = Math.min(stops.length - 1, Math.max(0, t * (stops.length - 1)));
		const index = Math.floor(scaled);
		const frac = scaled - index;
		const start = parseHex(stops[index]);
		const end = parseHex(stops[Math.min(index + 1, stops.length - 1)]);
		const r = Math.round(start.r + (end.r - start.r) * frac);
		const g = Math.round(start.g + (end.g - start.g) * frac);
		const b = Math.round(start.b + (end.b - start.b) * frac);
		return `rgb(${r}, ${g}, ${b})`;
	};

	const getColor = (value: number | undefined) => {
		if (value === undefined || Number.isNaN(value)) {
			return colorStops[0] ?? '#d1d5db';
		}
		const normalized = Math.max(0, Math.min(1, (value - min) / range));
		return interpolateColor(colorStops, normalized);
	};

	const getValue = (x: string, y: string) => valueMap.get(`${x}__${y}`);
</script>

{#if !xDomain.length || !yDomain.length}
	<div class="heatmap__placeholder">No data to display</div>
{:else}
	<svg class="heatmap" {viewBox} role="img" aria-label="Heatmap chart">
		<g class="heatmap__cells">
			{#each yDomain as y, row (y)}
				{#each xDomain as x, col (`${y}-${x}`)}
					{@const value = getValue(x, y)}
					<rect
						x={padding + col * cellWidth}
						y={padding + row * cellHeight}
						width={cellWidth}
						height={cellHeight}
						fill={getColor(value)}
						stroke={showGrid ? gridColor : 'none'}
						stroke-width={showGrid ? 1 : 0}
						rx={Math.min(4, Math.min(cellWidth, cellHeight) * 0.1)}
					>
						<title>{`${y} • ${x}: ${valueFormatter(value)}`}</title>
					</rect>
				{/each}
			{/each}
		</g>

		{#if showLabels}
			<g class="heatmap__x-labels" fill={labelColor} font-size={labelFontSize}>
				{#each xDomain as label, index (label)}
					<text
						x={padding + index * cellWidth + cellWidth / 2}
						y={padding + innerHeight + labelFontSize * 1.5}
						text-anchor="middle"
					>
						{label}
					</text>
				{/each}
			</g>

			<g class="heatmap__y-labels" fill={labelColor} font-size={labelFontSize}>
				{#each yDomain as label, index (label)}
					<text
						x={padding - 8}
						y={padding + index * cellHeight + cellHeight / 2}
						text-anchor="end"
						dominant-baseline="middle"
					>
						{label}
					</text>
				{/each}
			</g>
		{/if}
	</svg>
{/if}

<style>
	.heatmap {
		width: 100%;
		height: auto;
		display: block;
		font-family: inherit;
	}

	.heatmap__placeholder {
		padding: 1rem;
		text-align: center;
		color: #6b7280;
		font-size: 0.95rem;
		border: 1px dashed #cbd5f5;
		border-radius: 0.5rem;
	}
</style>
