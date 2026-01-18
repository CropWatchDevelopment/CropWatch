<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { TrafficClass, TrafficClassKey, TrafficHourBin } from './traffic.types';

	let {
		bins = [],
		classes = [],
		hiddenSeries = []
	}: {
		bins?: TrafficHourBin[];
		classes?: TrafficClass[];
		hiddenSeries?: TrafficClassKey[];
	} = $props();

	const dispatch = createEventDispatcher<{ toggle: { key: TrafficClassKey } }>();

	const width = 640;
	const height = 260;
	const margin = { top: 12, right: 10, bottom: 28, left: 42 };
	const innerWidth = width - margin.left - margin.right;
	const innerHeight = height - margin.top - margin.bottom;

	const colorMap: Record<TrafficClassKey, string> = {
		people: '#7db8ff',
		bicycles: '#52e3b1',
		cars: '#f6c453',
		trucks: '#fb7185',
		buses: '#c084fc'
	};

	const seriesData = $derived(
		classes.map((c) => ({
			key: c.key,
			label: c.short,
			color: colorMap[c.key],
			values: Array.from({ length: 24 }, (_, hour) => {
				const bin = bins.find((b) => b.hour === hour);
				return bin?.totals?.[c.key] ?? 0;
			})
		}))
	);

	const maxValue = $derived.by(() => {
		let max = 0;
		for (const series of seriesData) {
			if (hiddenSeries.includes(series.key)) continue;
			for (const value of series.values) {
				if (value > max) max = value;
			}
		}
		return Math.max(1, max);
	});

	const yTicks = $derived.by(() => {
		const steps = 4;
		const ticks = [] as number[];
		for (let i = 0; i <= steps; i += 1) {
			ticks.push(Math.round((maxValue / steps) * i));
		}
		return ticks;
	});

	function xFor(hour: number) {
		return margin.left + (hour / 23) * innerWidth;
	}

	function yFor(value: number) {
		return margin.top + innerHeight - (value / maxValue) * innerHeight;
	}

	function buildPath(values: number[]) {
		return values
			.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xFor(index)} ${yFor(value)}`)
			.join(' ');
	}

	function toggleSeries(key: TrafficClassKey) {
		dispatch('toggle', { key });
	}
</script>

<div class="traffic-chart">
	<div class="traffic-chart-top">
		<div class="traffic-chart-title">Chart (click to hide/show)</div>
		<div class="traffic-chart-legend">
			{#each seriesData as series (series.key)}
				<button
					type="button"
					class="traffic-legend-btn"
					aria-pressed={!hiddenSeries.includes(series.key)}
					onclick={() => toggleSeries(series.key)}
				>
					<span class="traffic-swatch" style={`background:${series.color}`}></span>
					<span>{series.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<svg
		class="traffic-chart-svg"
		viewBox={`0 0 ${width} ${height}`}
		preserveAspectRatio="xMidYMid meet"
		role="img"
		aria-label="Hourly line chart"
	>
		<g class="gridline">
			{#each yTicks as tick, index (index)}
				<line
					x1={margin.left}
					x2={width - margin.right}
					y1={yFor(tick)}
					y2={yFor(tick)}
				></line>
			{/each}
		</g>

		<g class="axis">
			{#each [0, 4, 8, 12, 16, 20, 23] as tick (tick)}
				<line x1={xFor(tick)} x2={xFor(tick)} y1={height - margin.bottom} y2={height - margin.bottom + 6}></line>
				<text x={xFor(tick)} y={height - 6} text-anchor="middle">{tick}</text>
			{/each}
			{#each yTicks as tick, index (index)}
				<text x={margin.left - 6} y={yFor(tick) + 4} text-anchor="end">{tick}</text>
			{/each}
		</g>

		{#each seriesData as series (series.key)}
			{#if !hiddenSeries.includes(series.key)}
				<path
					d={buildPath(series.values)}
					fill="none"
					stroke={series.color}
					stroke-width="2.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				></path>
				{#each series.values as value, index (index)}
					<circle
						cx={xFor(index)}
						cy={yFor(value)}
						r="2.2"
						fill={series.color}
						opacity="0.9"
					></circle>
				{/each}
			{/if}
		{/each}
	</svg>
</div>

<style>
	.traffic-chart {
		margin-top: 10px;
		padding: 10px;
		border-radius: 14px;
		border: 1px solid rgba(255, 255, 255, 0.12);
		background: rgba(11, 18, 32, 0.35);
	}

	.traffic-chart-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 8px;
	}

	.traffic-chart-title {
		font-weight: 900;
		font-size: 15px;
		color: rgba(242, 246, 255, 0.9);
	}

	.traffic-chart-legend {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		align-items: center;
	}

	.traffic-legend-btn {
		border: 1px solid rgba(255, 255, 255, 0.18);
		background: rgba(22, 36, 74, 0.72);
		color: rgba(242, 246, 255, 0.92);
		border-radius: 999px;
		padding: 6px 10px;
		font-size: 14px;
		font-weight: 900;
		cursor: pointer;
		user-select: none;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.traffic-legend-btn[aria-pressed='false'] {
		opacity: 0.55;
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.traffic-swatch {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		display: inline-block;
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35) inset;
	}

	.traffic-chart-svg {
		width: 100%;
		height: auto;
		display: block;
	}

	.axis text {
		fill: rgba(242, 246, 255, 0.78);
		font-size: 13px;
	}

	.axis line {
		stroke: rgba(255, 255, 255, 0.18);
	}

	.gridline line {
		stroke: rgba(255, 255, 255, 0.1);
	}
</style>
