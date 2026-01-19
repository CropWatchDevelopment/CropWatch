<script lang="ts">
	type MetricCard = {
		key: string;
		label: string;
		unit: string;
		current: number;
		delta: number;
		min: number;
		max: number;
		avg: number;
		median: number;
		stdDeviation: number;
		range: number;
		count: number;
		palette: {
			accent: string;
			bar: string;
			knob: string;
			badge: string;
		};
		positions: {
			min: number;
			avg: number;
			max: number;
			current: number;
		};
	};

	let {
		metricCards,
		alertCount
	}: {
		metricCards: MetricCard[];
		alertCount: number;
	} = $props();
</script>

<section class="grid gap-4 lg:grid-cols-2">
	{#each metricCards as card (card.key)}
		<div class="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-lg shadow-slate-950/50">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<p class="text-xs uppercase tracking-[0.3em] text-slate-400">{card.label}</p>
					<div class="mt-2 flex items-baseline gap-3">
						<p class="text-4xl font-semibold text-white">
							{card.current.toFixed(1)}{card.unit}
						</p>
						<span class={`text-sm font-semibold ${card.delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
							{card.delta >= 0 ? '▲' : '▼'}
							{Math.abs(card.delta).toFixed(1)}{card.unit}
							{card.delta >= 0 ? 'Above 24h Average' : 'Below 24h Average'}
						</span>
					</div>
				</div>
				<div class="text-right text-xs leading-relaxed text-slate-400">
					<p>Count: {card.count}</p>
					<p>Range: {card.range.toFixed(2)}{card.unit}</p>
					<p>Std dev: {card.stdDeviation.toFixed(2)}{card.unit}</p>
				</div>
			</div>

			<div class="mt-4 grid grid-cols-3 gap-3 text-center border-t border-slate-600 pt-4">
				<div>
					<p class="text-xs uppercase tracking-wide text-slate-400">Min</p>
					<p class="text-lg font-semibold text-slate-100">
						{card.min.toFixed(2)}{card.unit}
					</p>
				</div>
				<div>
					<p class="text-xs uppercase tracking-wide text-slate-400">Avg</p>
					<p class={`text-lg font-semibold ${card.palette.accent}`}>
						{card.avg.toFixed(2)}{card.unit}
					</p>
				</div>
				<div>
					<p class="text-xs uppercase tracking-wide text-slate-400">Max</p>
					<p class="text-lg font-semibold text-slate-100">
						{card.max.toFixed(2)}{card.unit}
					</p>
				</div>
			</div>

			<div class="mt-4">
				<div class="relative h-2 rounded-full bg-slate-900">
					<div
						class={`absolute h-full rounded-full ${card.palette.bar}`}
						style={`left:${card.positions.min}%; right:${100 - card.positions.max}%;`}
					></div>
					<span
						class="absolute -top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-950 bg-white/70"
						style={`left:${card.positions.min}%;`}
					></span>
					<span
						class={`absolute -top-2 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white/40 ${card.palette.knob} shadow-lg shadow-black/40`}
						style={`left:${card.positions.avg}%;`}
					></span>
					<span
						class="absolute -top-1.5 h-4 w-4 -translate-x-1/2 rounded-full border-2 border-slate-950 bg-white/70"
						style={`left:${card.positions.max}%;`}
					></span>
					<span
						class="absolute top-3 -translate-x-1/2 text-[10px] font-semibold text-white"
						style={`left:${card.positions.current}%;`}
					>
						Now
					</span>
				</div>
			</div>

			<div class="mt-6 grid gap-2 text-sm text-slate-300 sm:grid-cols-2">
				<p>
					<span class="text-slate-400">Median:</span>
					<span class={`ml-2 font-semibold ${card.palette.badge}`}>
						{card.median.toFixed(2)}{card.unit}
					</span>
				</p>
				<p>
					<span class="text-slate-400">Range:</span>
					<span class="ml-2 font-semibold text-slate-100">{card.range.toFixed(2)}{card.unit}</span>
				</p>
				<p>
					<span class="text-slate-400">Alerts:</span>
					<span class={`ml-2 font-semibold ${alertCount ? 'text-amber-300' : 'text-emerald-300'}`}>
						{alertCount}
					</span>
				</p>
				<p>
					<span class="text-slate-400">Central value:</span>
					<span class="ml-2 font-semibold text-slate-100">
						{card.median.toFixed(2)}{card.unit}
					</span>
				</p>
			</div>
		</div>
	{/each}
</section>
