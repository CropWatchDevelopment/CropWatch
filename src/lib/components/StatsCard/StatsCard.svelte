<script lang="ts">
	let { title, notation = '', min, max, avg } = $props();

	function percent(min: number, max: number, val: number) {
		if (max === min) return 50;
		return ((val - min) / (max - min)) * 100;
	}

	const avgPercent = percent(min, max, avg);

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

	const color = getColorForSensorType(title);
</script>

<div
	class="flex w-full flex-col items-center rounded-lg bg-gray-100 p-4 text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
>
	<!-- Title -->
	<h4 class="mb-2 text-center text-sm font-medium text-gray-600 dark:text-gray-400">
		{title}
		{#if notation}
			<span class="ml-1 text-xs text-gray-500 dark:text-gray-500">({notation})</span>
		{/if}
	</h4>

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
		<span>{min}{notation && ` ${notation}`}</span>
		<span class={`text-${color}`}>{avg}{notation && ` ${notation}`}</span>
		<span>{max}{notation && ` ${notation}`}</span>
	</div>

	<!-- Bar with 3 dots -->
	<div class="relative h-2 w-full rounded-full bg-zinc-300 dark:bg-zinc-700">
		<!-- Min and Max dots (gray in light mode, white in dark mode) -->
		<div
			class="absolute top-1/2 left-0 h-2 w-2 -translate-y-1/2 rounded-full bg-gray-400 dark:bg-white"
		/>
		<div
			class="absolute top-1/2 right-0 h-2 w-2 -translate-y-1/2 rounded-full bg-gray-400 dark:bg-white"
		/>

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
	</div>
</div>
