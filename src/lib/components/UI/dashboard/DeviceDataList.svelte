<script lang="ts">
	import type { Device } from '$lib/models/Device';
	import { convertObject } from '$lib/utilities/ConvertSensorDataObject';
	import { nameToEmoji } from '$lib/utilities/NameToEmoji';
	import { nameToNotation } from '$lib/utilities/NameToNotation';
	import { formatNumber } from '$lib/utilities/stats';
	import { _ } from 'svelte-i18n';
	import Duration from '$lib/components/ui/base/Duration.svelte';
	import { DurationUnits } from '$lib/utilities/duration';

	// Extend the Device type to include latestData
	interface DeviceWithLatestData extends Device {
		latestData: Record<string, any>;
		cw_device_type: {
			name: string;
			default_upload_interval?: number;
			primary_data_v2?: string;
			secondary_data_v2?: string;
			primary_data_notation?: string;
			secondary_data_notation?: string;
		};
	}

	let { device, isActive = false } = $props<{ device: DeviceWithLatestData; isActive?: boolean }>();

	// Log the active status for debugging
	$effect(() => {
		//console.log(`[DeviceDataList] Device ${device.name} (${device.dev_eui}) isActive: ${isActive}`);
	});

	// 1. Convert the latestData to an object
	let convertedData = $derived(convertObject(device.latestData));

	// 2. Extract the keys and filter out `created_at`
	let filteredKeys = $derived(Object.keys(convertedData).filter((key) => key !== 'created_at'));

	// 3. Add created_at to the end if it was present
	let dataPoints = $derived(
		'created_at' in convertedData ? [...filteredKeys, 'created_at'] : [...filteredKeys]
	);
</script>

<!-- Use a four-state color system for better UX:
     - Blue-gray (loading): Initial state before status is confirmed
     - Blue (neutral): When we don't have data
     - Green: When device is confirmed active with recent data
     - Red: When device is confirmed inactive (data too old)
-->
<div class="relative flex items-stretch">
	<!-- Pill indicator -->
	<div class="absolute top-0 bottom-0 left-0 my-1 w-1.5 rounded-full opacity-70"></div>
	<!-- class:bg-blue-300={isActive === null}
		class:bg-blue-400={device.latestData?.created_at === null}
		class:bg-green-500={isActive}
		class:bg-red-500={!isActive && device.latestData?.created_at} -->
	<!-- Device data block -->
	<div class="ml-1 flex-1">
		<div class="flex">
			<h3 class="mb-2 basis-1/3 text-lg font-semibold text-yellow-600 dark:text-yellow-400">
				{$_('Details')}
			</h3>
		</div>

		{#each dataPoints as dataPointKey, index}
			{#if device.latestData[dataPointKey] !== null}
				<div class="py-1 pr-1">
					<div class="flex items-center">
						<div class="flex min-w-[120px] items-center">
							<span class="mr-1.5 text-lg text-gray-600 dark:text-gray-400">
								{nameToEmoji(dataPointKey)}
							</span>
							<span class="text-sm text-gray-600 dark:text-gray-400">
								{$_(dataPointKey)}
							</span>
						</div>
						<span class="flex-grow"></span>

						{#if dataPointKey === 'created_at'}
							<p class="flex flex-row align-bottom text-xs text-gray-600 dark:text-gray-400">
								<Duration
									start={device.latestData.created_at}
									totalUnits={2}
									minUnits={DurationUnits.Second}
								/>
								&nbsp;{$_('ago')}
							</p>
						{:else}
							<div class="text-right">
								<span class="text-lg font-bold text-gray-900 dark:text-white">
									{formatNumber({ key: dataPointKey, value: device.latestData[dataPointKey] })}
								</span>
								<span class="text-accent-700 dark:text-accent-400 ml-0.5 align-top text-xs">
									{nameToNotation(dataPointKey)}
								</span>
							</div>
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
</div>
