<script lang="ts">
	import { Duration, DurationUnits, TweenedValue } from 'svelte-ux';
	import moment from 'moment';
	import { convertObject } from '$lib/utilities/ConvertSensorDataObject';
	import { nameToEmoji } from '$lib/utilities/NameToEmoji';
	import { nameToNotation } from '$lib/utilities/NameToNotation';
	import type { IDevice } from '$lib/interfaces/IDevice.interface';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';

	let { device, isActive }: { device: IDevice, isActive: boolean } = $props();

	// 1. Convert the latest_data to an object
	let convertedData = convertObject(device.latest_data);

	// 2. Extract the keys
	let dataPoints = $state(Object.keys(convertedData).filter((key) => key !== 'created_at'));

	// 3. Filter out `created_at` ...
	// dataPoints = dataPoints.filter((key) => key !== 'created_at');

	// 4. ... then push it to the end if it was present
	if (Object.keys(convertedData).includes('created_at')) {
		dataPoints.push('created_at');
	}
</script>

<div
	class="mr-2 border-l-8 text-primary-content
        {isActive ? 'border-l-green-500'
				: 'border-l-red-500'}
		{device.latest_data?.created_at === null ? 'opacity-50' : ''}"
>
	<div class="flex px-3">
		<h3 class="mb-2 basis-1/3 text-lg font-medium">{nameToJapaneseName('Details')}</h3>
	</div>

	{#each dataPoints as dataPointKey, index}
		{#if device.latest_data[dataPointKey] !== null}
			<div class="py-1">
				<div class="flex">
					<p class="text-base">{nameToEmoji(dataPointKey)}</p>
					<p class="ml-1 text-right">{nameToJapaneseName(dataPointKey)}</p>
					<span class="flex-grow"></span>

					{#if dataPointKey === 'created_at'}
						<p class="flex flex-row align-bottom text-base">
							<Duration
								start={device.latest_data.created_at}
								totalUnits={2}
								minUnits={DurationUnits.Second}
							/>&nbsp;ago
						</p>
					{:else if device.latest_data[dataPointKey] !== null}
						<TweenedValue value={device.latest_data[dataPointKey]} format="decimal" />
						<small class="text-accent-content">
							<sup>{nameToNotation(dataPointKey)}</sup>
						</small>
					{/if}
				</div>

				{#if dataPoints.length - 1 !== index}
					<div class="border-b border-[#7d7d81] px-3 pt-2"></div>
				{:else}
					<div class="px-3 pt-2"></div>
				{/if}
			</div>
		{/if}
	{/each}
</div>
