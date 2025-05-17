<script lang="ts">
	import { dbColumnToName } from '$lib/utilities/dbColumnToName';
	import { formatDateForDisplay, hasValue } from '$lib/utilities/helpers';
	let {
		latestData,
		key,
		name,
		notation = '',
		class: className,
		type
	}: { latestData: any; key: string; name: string; notation: string; class?: string; type?: string } = $props();

	const sensorType = type || (key === 'temperature_c' ? 'temperature' : key);
	
	// Format the value if it's a timestamp
	function formatValue(key: string, value: any): string {
		if (key === 'created_at') {
			return formatDateForDisplay(value);
		}
		return value;
	}
</script>

{#if hasValue(latestData, key)}
	<div 
		class={['reading-card', sensorType, className]} 
		style={`--card-color: var(--color-${sensorType});`}
	>
		<h3>{dbColumnToName(name)}</h3>
		<p class="value">
			{formatValue(key, latestData[key])}
			{#if notation && key !== 'created_at'}
				<sup>
					<small>
						{notation}
					</small>
				</sup>
			{/if}
		</p>
	</div>
{/if}

<style>
	@import 'Data-Card.css';
</style>
