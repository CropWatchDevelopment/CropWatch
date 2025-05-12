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

<div
    class=" border-l-8
        {isActive ? 'border-l-green-500'
                : 'border-l-red-500'}
        {device.latestData?.created_at === null ? 'opacity-50' : ''}"
>
    <div class="flex px-3">
        <h3 class="mb-2 basis-1/3 text-lg font-medium">{nameToJapaneseName('Details')}</h3>
    </div>

    {#each dataPoints as dataPointKey, index}
        {#if device.latestData[dataPointKey] !== null}
            <div class="py-1 pl-2">
                <div class="flex">
                    <p class="text-base text-primary">{nameToEmoji(dataPointKey)}</p>
                    <p class="ml-1 text-right">{nameToJapaneseName(dataPointKey)}</p>
                    <span class="flex-grow"></span>

                    {#if dataPointKey === 'created_at'}
                        <p class="flex flex-row align-bottom text-base">
                            <Duration
                                start={device.latestData.created_at}
                                totalUnits={2}
                                minUnits={DurationUnits.Second}
                            />&nbsp;ago
                        </p>
                    {:else}
                        <TweenedValue value={device.latestData[dataPointKey]} format="decimal" />
                        <small>
                            <sup class="text-accent-300">{nameToNotation(dataPointKey)}</sup>
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