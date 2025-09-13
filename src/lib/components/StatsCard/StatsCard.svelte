<script lang="ts">
	import type { DeviceStats } from '$lib/models/DeviceDataRecord';
	import { nameToNotation } from '$lib/utilities/NameToNotation';
	import { formatNumber, getTextColorByKey } from '$lib/utilities/stats';
	import { mdiArrowDownBold, mdiArrowUpBold, mdiMinus } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import Icon from '$lib/components/ui/base/Icon.svelte';
	import MaterialIcon from '../UI/icons/MaterialIcon.svelte';

	type Props = {
		key: string;
		stats?: DeviceStats;
		expandable?: boolean;
	};

	let { key, stats = {}, expandable = true }: Props = $props();
	let { min, max, avg, median, stdDev, count, lastReading, trend } = $derived(stats[key]);
	let title = $derived($_(key));
	let notation = $derived(nameToNotation(key));

	let expanded = $state(false);

	function percent(min: number, max: number, val: number) {
		if (max === min) return 50;
		return ((val - min) / (max - min)) * 100;
	}

	const avgPercent = $derived(percent(min, max, avg));
	const medianPercent = $derived(median !== undefined ? percent(min, max, median) : null);

	// Use `$derived` to ensure these values are reactive when UI theme changes
	const textColor = $derived(getTextColorByKey(key));

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

	function toggleExpand() {
		if (expandable) {
			expanded = !expanded;
		}
	}
</script>

<div
	class="panel flex w-full flex-col items-center rounded-lg p-4 text-zinc-900 shadow-sm dark:text-white"
	class:cursor-pointer={expandable}
	role="button"
	tabindex="0"
	onclick={toggleExpand}
	onkeydown={(e) => e.key === 'Enter' && toggleExpand()}
>
	<!-- Title with Current reading and Trend -->
	<div class="mb-2 flex w-full items-center justify-between">
		<h4 class="text-xl font-medium text-gray-500 dark:text-gray-200">
			{title}
		</h4>

		{#if lastReading !== undefined && trend !== undefined}
			<div class="flex items-center space-x-1">
				<span class="text-lg font-bold">
					{formatNumber({ key, value: lastReading })}
					{#if notation}
						<sup class="vertia text-xs">{notation}</sup>
					{/if}
				</span>
				<span class={getTrendColor(trend)}>
					<Icon path={getTrendIcon(trend)} size="16px" />
				</span>
			</div>
		{/if}
	</div>

	<!-- Labels -->
	<div class="mb-0.5 flex w-full justify-between px-1 text-sm font-normal text-gray-400">
		<span>{$_('Min')}</span>
		<span>{$_('Avg')}</span>
		<span>{$_('Max')}</span>
	</div>

	<!-- Values -->
	<div class="mb-2 flex w-full justify-between px-1 text-2xl font-bold">
		<span>
			{formatNumber({ key, value: min })}
			{#if notation}
				<sup class="text-xs">{notation}</sup>
			{/if}
		</span>
		<span style:color={textColor}>
			{formatNumber({ key, value: avg })}
			{#if notation}
				<sup class="text-xs">{notation}</sup>
			{/if}
		</span>
		<span>
			{formatNumber({ key, value: max })}
			{#if notation}
				<sup class="vertia text-xs">{notation}</sup>
			{/if}
		</span>
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
			style:background-color={textColor}
			style:left="{avgPercent}%"
		></div>

		<!-- Median dot (if available) -->
		{#if medianPercent !== null}
			<div
				class="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
				style:background-color={textColor}
				style:left="{medianPercent}%"
				style:opacity="0.7"
			></div>
		{/if}
	</div>

	<!-- Expanded Details -->
	{#if expanded}
		<div class="mt-4 w-full border-t border-gray-200 pt-3 text-lg dark:border-gray-700">
			<div class="grid grid-cols-2 gap-y-2">
				<div>
					<span class="text-gray-400 dark:text-gray-400">{$_('Count')}:</span>
					<span class="ml-1 font-medium">{count !== undefined ? count : $_('N/A')}</span>
				</div>

				<div>
					<span class="text-gray-400 dark:text-gray-400">{$_('Median')}:</span>
					<span class="ml-1 font-medium">
						{median !== undefined ? formatNumber({ key, value: median }) + (notation || '') : 'N/A'}
					</span>
				</div>

				<div>
					<span class="text-gray-400 dark:text-gray-400">{$_('Std Dev')}:</span>
					<span class="ml-1 font-medium">
						{stdDev !== undefined ? formatNumber({ key, value: stdDev }) + (notation || '') : 'N/A'}
					</span>
				</div>

				<div>
					<span class="text-gray-400 dark:text-gray-400">{$_('Range')}:</span>
					<span class="ml-1 font-medium">
						{max !== undefined && min !== undefined
							? formatNumber({ key, value: max - min }) + (notation || '')
							: $_('N/A')}
					</span>
				</div>
			</div>
		</div>
	{/if}

	{#if expandable}
		<div class="mt-2 flex w-full justify-center pt-2">
			<div
				class="flex w-full justify-center border-t border-gray-200 pt-4 text-xs text-gray-400 dark:text-gray-300"
			>
				<MaterialIcon
					name={expanded ? 'expand_circle_up' : 'expand_circle_down'}
					size="small"
					class="mr-1 inline-block"
				/>
				{expanded ? $_('Click to collapse') : $_('Click to expand')}
			</div>
		</div>
	{/if}
</div>
