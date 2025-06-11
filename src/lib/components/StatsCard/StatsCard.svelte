<script lang="ts">
	import { mdiArrowDownBold, mdiArrowUpBold, mdiMinus } from '@mdi/js';
	import { Icon } from 'svelte-ux';

	let { 
		title, 
		notation = '', 
		min, 
		max, 
		avg,
		median,
		stdDev,
		count,
		lastReading,
		trend,
		expandable = true
	} = $props();

	let expanded = $state(false);

	function percent(min: number, max: number, val: number) {
		if (max === min) return 50;
		return ((val - min) / (max - min)) * 100;
	}

	const avgPercent = percent(min, max, avg);
	const medianPercent = median !== undefined ? percent(min, max, median) : null;

	// Get the appropriate color based on the sensor type
	function getColorForSensorType(title: string): string {
		const titleLower = title.toLowerCase();

		if (titleLower.includes('temp')) return 'orange-500';
		if (titleLower.includes('moisture')) return 'sky-500';
		if (titleLower.includes('ph')) return 'yellow-500';
		if (titleLower.includes('conduct') || titleLower.includes('ec')) return 'violet-500';
		if (titleLower.includes('co2')) return 'purple-500';
		if (titleLower.includes('humid')) return 'blue-500';
		return 'zinc-400';
	}

	function getTrendIcon(trend: 'up' | 'down' | 'stable' | null) {
		if (trend === 'up') return mdiArrowUpBold;
		if (trend === 'down') return mdiArrowDownBold;
		return mdiMinus;
	}

	function getTrendColor(trend: 'up' | 'down' | 'stable' | null) {
		if (trend === 'up') return 'text-green-500';
		if (trend === 'down') return 'text-red-500';
		return 'text-gray-400';
	}

	// Format values to be more readable
	function formatValue(value: number | undefined): string {
		if (value === undefined) return 'N/A';
		return value.toFixed(2);
	}

	const color = getColorForSensorType(title);
	
	function toggleExpand() {
		if (expandable) {
			expanded = !expanded;
		}
	}
</script>

<div
        class="flex w-full flex-col items-center rounded-lg bg-gray-100 p-4 text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
        class:cursor-pointer={expandable}
        role="button"
        tabindex="0"
        onclick={toggleExpand}
        onkeydown={(e) => e.key === 'Enter' && toggleExpand()}
>
	<!-- Title with Current reading and Trend -->
	<div class="flex w-full items-center justify-between mb-2">
		<h4 class="text-sm font-medium text-gray-600 dark:text-gray-400">
			{title}
			{#if notation}
				<span class="ml-1 text-xs text-gray-500 dark:text-gray-500">({notation})</span>
			{/if}
		</h4>
		
		{#if lastReading !== undefined && trend !== undefined}
			<div class="flex items-center space-x-1">
				<span class="text-sm font-bold">{formatValue(lastReading)}{notation}</span>
				<span class={getTrendColor(trend)}>
					<Icon path={getTrendIcon(trend)} size="16px" />
				</span>
			</div>
		{/if}
	</div>

	<!-- Labels -->
	<div
		class="mb-0.5 flex w-full justify-between px-1 text-[11px] font-normal text-gray-400 dark:text-gray-500"
	>
		<span>Min</span>
		<span>Avg</span>
		<span>Max</span>
	</div>

	<!-- Values -->
	<div class="mb-2 flex w-full justify-between px-1 text-sm font-bold">
		<span>{formatValue(min)}{notation && ` ${notation}`}</span>
		<span class={`text-${color}`}>{formatValue(avg)}{notation && ` ${notation}`}</span>
		<span>{formatValue(max)}{notation && ` ${notation}`}</span>
	</div>

	<!-- Bar with dots -->
	<div class="relative h-2 w-full rounded-full bg-zinc-300 dark:bg-zinc-700">
		<!-- Min and Max dots (gray in light mode, white in dark mode) -->
                <div
                        class="absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-gray-400 dark:bg-white"
                ></div>
                <div
                        class="absolute top-1/2 right-0 h-2 w-2 -translate-y-1/2 rounded-full bg-gray-400 dark:bg-white"
                ></div>

		<!-- Avg dot colored -->
		<div
			class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
			class:bg-orange-500={color === 'orange-500'}
			class:bg-sky-500={color === 'sky-500'}
			class:bg-yellow-500={color === 'yellow-500'}
			class:bg-violet-500={color === 'violet-500'}
			class:bg-purple-500={color === 'purple-500'}
			class:bg-blue-500={color === 'blue-500'}
			class:bg-zinc-400={color === 'zinc-400'}
			style="left: {avgPercent}%;"
		></div>
		
		<!-- Median dot (if available) -->
		{#if medianPercent !== null}
			<div
				class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
				class:bg-orange-500={color === 'orange-500'}
				class:bg-sky-500={color === 'sky-500'}
				class:bg-yellow-500={color === 'yellow-500'}
				class:bg-violet-500={color === 'violet-500'}
				class:bg-purple-500={color === 'purple-500'}
				class:bg-blue-500={color === 'blue-500'}
				class:bg-zinc-400={color === 'zinc-400'}
				style="left: {medianPercent}%; opacity: 0.7;"
			></div>
		{/if}
	</div>
	
	<!-- Expanded Details -->
	{#if expanded}
		<div class="w-full mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 text-sm">
			<div class="grid grid-cols-2 gap-y-2">
				<div>
					<span class="text-gray-400 dark:text-gray-500">Count:</span>
					<span class="ml-1 font-medium">{count !== undefined ? count : 'N/A'}</span>
				</div>
				
				<div>
					<span class="text-gray-400 dark:text-gray-500">Median:</span>
					<span class="ml-1 font-medium">{median !== undefined ? formatValue(median) + (notation || '') : 'N/A'}</span>
				</div>
				
				<div>
					<span class="text-gray-400 dark:text-gray-500">Std Dev:</span>
					<span class="ml-1 font-medium">{stdDev !== undefined ? formatValue(stdDev) + (notation || '') : 'N/A'}</span>
				</div>
				
				<div>
					<span class="text-gray-400 dark:text-gray-500">Range:</span>
					<span class="ml-1 font-medium">{(max !== undefined && min !== undefined) ? formatValue(max - min) + (notation || '') : 'N/A'}</span>
				</div>
			</div>
		</div>
	{/if}
	
	{#if expandable}
		<div class="w-full flex justify-center mt-1">
			<div class="text-xs text-gray-400 dark:text-gray-500">
				{expanded ? 'Click to collapse' : 'Click to expand'}
			</div>
		</div>
	{/if}
</div>
