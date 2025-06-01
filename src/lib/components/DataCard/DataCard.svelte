<script lang="ts">
	import { dbColumnToName } from '$lib/utilities/dbColumnToName';
	import { formatDateForDisplay, hasValue } from '$lib/utilities/helpers';

	let {
		latestData,
		key,
		name,
		notation = '',
		class: className,
		type,
		metadata = false
	}: {
		latestData: any;
		key: string;
		name: string;
		notation?: string;
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

	const sensorType = normalizeSensorType(type || key);

	function getNotation(key: string): string {
		const notationMap: Record<string, string> = {
			temperature_c: '°C',
			temperature: '°C',
			humidity: '%',
			moisture: '%',
			co2: 'ppm',
			ec: 'mS/cm',
			cm: 'cm',
			battery_level: '%',
			ph: '',
			created_at: '',
			dev_eui: ''
		};
		return notationMap[key] || notation || '';
	}

	function formatValue(key: string, value: any): string {
		if (key === 'created_at') {
			return formatDateForDisplay(value);
		}
		return value;
	}

	function getBorderColorClass(sensorType: string, isMetadata: boolean): string {
		if (isMetadata) return 'border-transparent';
		const colorMap: Record<string, string> = {
			temperature: 'border-orange-500',
			humidity: 'border-blue-500',
			moisture: 'border-sky-500',
			co2: 'border-purple-500',
			ph: 'border-yellow-500',
			ec: 'border-violet-500'
		};
		return colorMap[sensorType] || 'border-zinc-400';
	}

	function getTextColorClass(sensorType: string, isMetadata: boolean): string {
		if (isMetadata) return 'text-gray-400 dark:text-gray-400';
		const colorMap: Record<string, string> = {
			temperature: 'text-orange-500 dark:text-orange-500',
			humidity: 'text-blue-500 dark:text-blue-400',
			moisture: 'text-sky-500 dark:text-sky-400',
			co2: 'text-purple-500 dark:text-purple-400',
			ph: 'text-yellow-500 dark:text-yellow-400',
			ec: 'text-violet-500 dark:text-violet-400'
		};
		return colorMap[sensorType] || 'text-zinc-400 dark:text-zinc-400';
	}

	const isMetadata = metadata || key === 'created_at' || key === 'dev_eui';
	const displayNotation = getNotation(key);
</script>

{#if hasValue(latestData, key)}
	<div
		class={[
			'rounded-lg bg-white p-4 text-center transition-all duration-200 ease-in-out dark:bg-zinc-800',
			'shadow-sm hover:shadow-md',
			isMetadata ? '' : 'hover:-translate-y-1',
			isMetadata ? 'border-l' : 'border-l-4',
			getBorderColorClass(sensorType, isMetadata),
			className
		]
			.filter(Boolean)
			.join(' ')}
	>
		<!-- Label -->
		<h3
			class={`m-0 ${isMetadata ? 'mb-1 text-xs text-gray-400 dark:text-gray-500' : 'mb-2 text-sm text-gray-500 dark:text-gray-400'}`}
		>
			{dbColumnToName(name)}
		</h3>

		<!-- Value -->
		<p
			class={`m-0 ${isMetadata ? 'mt-1 mb-1 text-base font-medium' : 'mb-0 text-2xl font-bold'} ${getTextColorClass(sensorType, isMetadata)}`}
		>
			{formatValue(key, latestData[key])}
			{#if displayNotation}
				<sup><small class="text-xs">{displayNotation}</small></sup>
			{/if}
		</p>
	</div>
{/if}
