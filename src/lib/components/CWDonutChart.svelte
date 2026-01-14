<script lang="ts">
	export interface DonutSegment {
		label: string;
		value: number;
		color?: string;
	}

	interface Props {
		/** Array of data segments to display */
		data: DonutSegment[];
		/** Size of the chart (width and height in pixels) */
		size?: number;
		/** Thickness of the donut ring (0-1, percentage of radius) */
		thickness?: number;
		/** Show center label */
		showCenter?: boolean;
		/** Center label text (defaults to total) */
		centerLabel?: string;
		/** Center sub-label text */
		centerSubLabel?: string;
		/** Show legend */
		showLegend?: boolean;
		/** Legend position */
		legendPosition?: 'right' | 'bottom';
		/** Enable hover effects */
		interactive?: boolean;
		/** Animation duration in ms */
		animationDuration?: number;
	}

	let {
		data,
		size = 200,
		thickness = 0.35,
		showCenter = true,
		centerLabel,
		centerSubLabel = 'Total',
		showLegend = true,
		legendPosition = 'right',
		interactive = true,
		animationDuration = 600
	}: Props = $props();

	// Default color palette matching your dark theme
	const defaultColors = [
		'#10b981', // emerald-500
		'#f59e0b', // amber-500
		'#ef4444', // red-500
		'#0ea5e9', // sky-500
		'#8b5cf6', // violet-500
		'#ec4899', // pink-500
		'#06b6d4', // cyan-500
		'#84cc16', // lime-500
		'#f97316', // orange-500
		'#6366f1'  // indigo-500
	];

	let hoveredIndex = $state<number | null>(null);

	const total = $derived(data.reduce((sum, segment) => sum + segment.value, 0));
	const displayCenterLabel = $derived(centerLabel ?? total.toString());

	// Calculate percentages directly (reactive)
	const percentages = $derived(data.map((segment) => (total > 0 ? segment.value / total : 0)));

	// Calculate segments with their arc paths
	const segments = $derived.by(() => {
		const radius = size / 2;
		const innerRadius = radius * (1 - thickness);
		const centerX = radius;
		const centerY = radius;

		let currentAngle = -90; // Start from top

		return data.map((segment, index) => {
			const percentage = percentages[index] ?? 0;
			const angle = percentage * 360;
			const startAngle = currentAngle;
			const endAngle = currentAngle + angle;

			const startRad = (startAngle * Math.PI) / 180;
			const endRad = (endAngle * Math.PI) / 180;

			const x1Outer = centerX + radius * Math.cos(startRad);
			const y1Outer = centerY + radius * Math.sin(startRad);
			const x2Outer = centerX + radius * Math.cos(endRad);
			const y2Outer = centerY + radius * Math.sin(endRad);

			const x1Inner = centerX + innerRadius * Math.cos(endRad);
			const y1Inner = centerY + innerRadius * Math.sin(endRad);
			const x2Inner = centerX + innerRadius * Math.cos(startRad);
			const y2Inner = centerY + innerRadius * Math.sin(startRad);

			const largeArcFlag = angle > 180 ? 1 : 0;

			let path = '';
			if (percentage >= 0.9999) {
				// Full circle - draw with two arcs
				const midRad = startRad + Math.PI;
				const xMidOuter = centerX + radius * Math.cos(midRad);
				const yMidOuter = centerY + radius * Math.sin(midRad);
				const xMidInner = centerX + innerRadius * Math.cos(midRad);
				const yMidInner = centerY + innerRadius * Math.sin(midRad);

				path = `M ${x1Outer} ${y1Outer} A ${radius} ${radius} 0 0 1 ${xMidOuter} ${yMidOuter} A ${radius} ${radius} 0 0 1 ${x1Outer} ${y1Outer} L ${x2Inner} ${y2Inner} A ${innerRadius} ${innerRadius} 0 0 0 ${xMidInner} ${yMidInner} A ${innerRadius} ${innerRadius} 0 0 0 ${x2Inner} ${y2Inner} Z`;
			} else if (percentage > 0.001) {
				path = `M ${x1Outer} ${y1Outer} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer} L ${x1Inner} ${y1Inner} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner} Z`;
			}

			currentAngle = endAngle;

			return {
				...segment,
				path,
				color: segment.color ?? defaultColors[index % defaultColors.length],
				percentage,
				index
			};
		});
	});

	function handleMouseEnter(index: number) {
		if (interactive) hoveredIndex = index;
	}

	function handleMouseLeave() {
		if (interactive) hoveredIndex = null;
	}
</script>

<div
	class="flex items-center gap-6"
	class:flex-col={legendPosition === 'bottom'}
	class:flex-row={legendPosition === 'right'}
>
	<!-- Chart -->
	<div class="relative flex-shrink-0" style="width: {size}px; height: {size}px;">
		<svg
			viewBox="0 0 {size} {size}"
			class="h-full w-full drop-shadow-lg"
			role="img"
			aria-label="Donut chart"
		>
			<!-- Background ring -->
			<circle
				cx={size / 2}
				cy={size / 2}
				r={size / 2 - 1}
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				class="text-slate-800/50"
			/>

			<!-- Segments -->
			{#each segments as segment (segment.label)}
				{#if segment.path}
					<path
						d={segment.path}
						fill={segment.color}
						class="cursor-pointer transition-all duration-200 {hoveredIndex === null || hoveredIndex === segment.index ? 'opacity-100' : 'opacity-40'}"
						style="transform: {hoveredIndex === segment.index ? 'scale(1.03)' : 'scale(1)'}; transform-origin: center;"
						onmouseenter={() => handleMouseEnter(segment.index)}
						onmouseleave={handleMouseLeave}
						role="graphics-symbol"
						aria-label="{segment.label}: {segment.value}"
					/>
				{/if}
			{/each}

			<!-- Inner circle (donut hole) -->
			<circle
				cx={size / 2}
				cy={size / 2}
				r={size / 2 * (1 - thickness) - 2}
				class="fill-slate-900"
			/>
		</svg>

		<!-- Center content -->
		{#if showCenter}
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
				<span class="text-2xl font-bold text-slate-50">
					{hoveredIndex !== null ? (data[hoveredIndex]?.value ?? displayCenterLabel) : displayCenterLabel}
				</span>
				<span class="text-xs text-slate-400">
					{hoveredIndex !== null ? (data[hoveredIndex]?.label ?? centerSubLabel) : centerSubLabel}
				</span>
			</div>
		{/if}
	</div>

	<!-- Legend -->
	{#if showLegend}
		<div
			class="flex flex-wrap gap-2"
			class:flex-col={legendPosition === 'right'}
			class:flex-row={legendPosition === 'bottom'}
			class:justify-center={legendPosition === 'bottom'}
		>
			{#each segments as segment (segment.label)}
				<button
					type="button"
					class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors hover:bg-slate-800/50 {hoveredIndex === segment.index ? 'bg-slate-800/70' : ''}"
					onmouseenter={() => handleMouseEnter(segment.index)}
					onmouseleave={handleMouseLeave}
				>
					<span
						class="h-3 w-3 flex-shrink-0 rounded-full"
						style="background-color: {segment.color};"
					></span>
					<span class="text-slate-300">{segment.label}</span>
					<span class="font-mono text-slate-400">
						{segment.value}
						<span class="text-slate-400">({(segment.percentage * 100).toFixed(0)}%)</span>
					</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
