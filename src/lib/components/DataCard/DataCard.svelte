<script lang="ts">
	import { hasValue } from '$lib/utilities/helpers';
	import { nameToNotation } from '$lib/utilities/NameToNotation';
	import { formatNumber, getBorderColorByKey, getTextColorByKey } from '$lib/utilities/stats';
	import { _ } from 'svelte-i18n';

	let {
		latestData,
		key,
		name,
		class: className,
		type,
		metadata = false
	}: {
		latestData: any;
		key: string;
		name: string;
		class?: string;
		type?: string;
		metadata?: boolean;
	} = $props();

	// Normalize sensor key to canonical type name
	function normalizeSensorType(key: string): string {
		const map: Record<string, string> = {
			temperature_c: 'temperature',
			temperature: 'temperature',
			humidity: 'humidity',
			moisture: 'moisture',
			co2: 'co2',
			ph: 'ph',
			ec: 'ec',
			battery_level: 'battery',
			created_at: 'meta',
			dev_eui: 'meta'
		};
		return map[key] || key;
	}

	const isMetadata = metadata || key === 'created_at' || key === 'dev_eui';
	const sensorType = normalizeSensorType(type || key);
	const displayNotation = nameToNotation(key);

	// Use `$derived` to ensure these values are reactive when UI theme changes
	const borderColor = $derived(getBorderColorByKey(sensorType, isMetadata));
	const textColor = $derived(getTextColorByKey(sensorType, isMetadata));
</script>

{#if hasValue(latestData, key)}
	{@const value = latestData[key]}
	<div
		class="flex flex-col justify-center gap-1 rounded-r-lg bg-gray-50 p-4 text-center shadow-sm transition-all duration-200 ease-in-out dark:bg-zinc-800 {isMetadata
			? 'border-l'
			: 'border-l-4'} {className}"
		style:border-color={borderColor}
	>
		<!-- Label -->
		<h3
			class={`m-0 leading-5 ${isMetadata ? 'text-xs text-gray-400 dark:text-gray-500' : 'text-md text-gray-500 dark:text-gray-400'}`}
		>
			{$_(name)}
		</h3>

		<!-- Value -->
		<p
			class="m-0 {isMetadata ? 'text-base font-medium' : 'mb-0 text-2xl font-bold'}"
			style:color={textColor}
		>
			{#if typeof value === 'number'}
				{formatNumber({ key, value })}
			{:else}
				{value}
			{/if}
			{#if displayNotation}
				<sup><small class="text-xs">{displayNotation}</small></sup>
			{/if}
		</p>
	</div>
{/if}
