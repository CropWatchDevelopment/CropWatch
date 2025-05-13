<script lang="ts">
	import { dbColumnToName } from '$lib/utilities/dbColumnToName';
	import { hasValue } from '$lib/utilities/helpers';
	let {
		latestData,
		key,
		name,
		notation = '',
		class: className,
		type
	}: { latestData: any; key: string; name: string; notation: string; class?: string; type?: string } = $props();

	const sensorType = type || (key === 'temperature_c' ? 'temperature' : key);
</script>

{#if hasValue(latestData, key)}
	<div 
		class={['reading-card', sensorType, className]} 
		style={`--card-color: var(--color-${sensorType});`}
	>
		<h3>{dbColumnToName(name)}</h3>
		<p class="value">
			{latestData[key]}
			{#if notation}
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
