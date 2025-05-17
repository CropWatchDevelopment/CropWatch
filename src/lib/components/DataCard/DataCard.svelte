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
	}: { latestData: any; key: string; name: string; notation?: string; class?: string; type?: string; metadata?: boolean } = $props();

	// Get the correct sensor type for styling
	const sensorType = type || (key === 'temperature_c' ? 'temperature' : key);
	
	// Get the correct notation based on the key
	function getNotation(key: string): string {
		const notationMap: Record<string, string> = {
			'temperature_c': '°C',
			'temperature': '°C',
			'humidity': '%',
			'moisture': '%',
			'co2': 'ppm',
			'ec': 'mS/cm',
			'battery_level': '%',
			'ph': '', // No unit for pH
			'created_at': '',
			'dev_eui': ''
		};
		return notationMap[key] || notation || '';
	}

	// Format the value if it's a timestamp or needs special formatting
	function formatValue(key: string, value: any): string {
		if (key === 'created_at') {
			return formatDateForDisplay(value);
		}
		return value;
	}

	// Get border color class based on sensor type
	function getBorderColorClass(sensorType: string, isMetadata: boolean): string {
		// No colored borders for metadata
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

	// Get text color class based on sensor type
	function getTextColorClass(sensorType: string, isMetadata: boolean): string {
		// Neutral colors for metadata
		if (isMetadata) return 'text-gray-400 dark:text-gray-400';
		
		const colorMap: Record<string, string> = {
			temperature: 'text-orange-500 dark:text-orange-400',
			humidity: 'text-blue-500 dark:text-blue-400',
			moisture: 'text-sky-500 dark:text-sky-400',
			co2: 'text-purple-500 dark:text-purple-400',
			ph: 'text-yellow-500 dark:text-yellow-400',
			ec: 'text-violet-500 dark:text-violet-400'
		};
		return colorMap[sensorType] || 'text-zinc-400 dark:text-zinc-400';
	}
	
	// Determine if this is a metadata card
	const isMetadata = metadata || key === 'created_at' || key === 'dev_eui';
	
	// Get the correct notation for this key
	const displayNotation = getNotation(key);
</script>

{#if hasValue(latestData, key)}
	<div 
		class={[
			'p-4 rounded-lg text-center bg-white dark:bg-zinc-800 transition-all duration-200 ease-in-out',
			'shadow-sm hover:shadow-md',
			// Only add hover animation to sensor readings, not metadata
			isMetadata ? '' : 'hover:-translate-y-1',
			// Only add colored left border to sensor readings
			isMetadata ? 'border-l' : 'border-l-4',
			getBorderColorClass(sensorType, isMetadata),
			className
		].filter(Boolean).join(' ')}
	>
		<!-- Title: smaller and more subdued for metadata -->
		<h3 class={`m-0 ${isMetadata ? 'text-xs mb-1 text-gray-400 dark:text-gray-500' : 'text-sm mb-2 text-gray-500 dark:text-gray-400'}`}>
			{dbColumnToName(name)}
		</h3>
		
		<!-- Value: maintain prominence for sensor readings, more subtle for metadata -->
		<p class={`m-0 ${isMetadata ? 'text-base font-medium mt-1 mb-1' : 'text-2xl font-bold mb-0'} ${getTextColorClass(sensorType, isMetadata)}`}>
			{formatValue(key, latestData[key])}
			{#if displayNotation}
				<sup>
					<small class="text-xs">
						{displayNotation}
					</small>
				</sup>
			{/if}
		</p>
	</div>
{/if}
