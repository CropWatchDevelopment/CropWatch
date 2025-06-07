<script lang="ts">
    import { Duration, TweenedValue } from 'svelte-ux';
    import { DurationUnits } from '@layerstack/utils';
    import { convertObject } from '$lib/utilities/ConvertSensorDataObject';
    import { nameToEmoji } from '$lib/utilities/NameToEmoji';
    import { nameToNotation } from '$lib/utilities/NameToNotation';
    import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
    import type { Device } from '$lib/models/Device';

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

    let { device, isActive = false } = $props<{ device: DeviceWithLatestData, isActive?: boolean }>();
    
    // Log the active status for debugging
    $effect(() => {
        console.log(`[DeviceDataList] Device ${device.name} (${device.dev_eui}) isActive: ${isActive}`);
    });

    // 1. Convert the latestData to an object
    let convertedData = $derived(convertObject(device.latestData));

    // 2. Extract the keys and filter out `created_at`
    let filteredKeys = $derived(Object.keys(convertedData).filter(key => key !== 'created_at'));
    
    // 3. Add created_at to the end if it was present
let dataPoints = $derived(
  'created_at' in convertedData
    ? [...filteredKeys, 'created_at']
    : [...filteredKeys]
);

</script>

<!-- Use a four-state color system for better UX:
     - Blue-gray (loading): Initial state before status is confirmed
     - Blue (neutral): When we don't have data
     - Green: When device is confirmed active with recent data
     - Red: When device is confirmed inactive (data too old)
-->
<div
    class="border-l-8
        {isActive === null ? 'border-l-blue-300' : 
         device.latestData?.created_at === null ? 'border-l-blue-400 opacity-50' : 
         isActive ? 'border-l-green-500' : 'border-l-red-500'}"
>
    <div class="flex px-3">
        <h3 class="mb-2 basis-1/3 text-lg font-semibold text-yellow-600 dark:text-yellow-400">{nameToJapaneseName('Details')}</h3>
    </div>

    {#each dataPoints as dataPointKey, index}
        {#if device.latestData[dataPointKey] !== null}
            <div class="py-1 pl-2">
                <div class="flex items-center">
                    <div class="flex items-center min-w-[120px]">
                        <span class="text-gray-500 dark:text-gray-400 text-lg mr-1.5">{nameToEmoji(dataPointKey)}</span>
                        <span class="text-gray-600 dark:text-gray-400 text-sm">{nameToJapaneseName(dataPointKey)}</span>
                    </div>
                    <span class="flex-grow"></span>

                    {#if dataPointKey === 'created_at'}
                        <p class="flex flex-row align-bottom text-xs text-gray-500 dark:text-gray-400">
                            <Duration
                                start={device.latestData.created_at}
                                totalUnits={2}
                                minUnits={DurationUnits.Second}
                            />&nbsp;ago
                        </p>
                    {:else}
                        <div class="text-right">
                            <span class="text-gray-900 dark:text-white font-bold text-lg">
                                <TweenedValue value={device.latestData[dataPointKey]} format="decimal" />
                            </span>
                            <span class="text-accent-700 dark:text-accent-400 text-xs ml-0.5 align-top">
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