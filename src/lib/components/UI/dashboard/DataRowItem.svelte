<script lang="ts">
    import { Collapse, TweenedValue } from 'svelte-ux';
    import Button from './components/Button.svelte';
    import { goto } from '$app/navigation';
    import { mdiArrowRight } from '@mdi/js';
    import moment from 'moment';
    import { nameToEmoji } from '$lib/utilities/NameToEmoji';
    import type { Device } from '$lib/models/Device';
    import type { Location } from '$lib/models/Location';
    import { createActiveTimer } from '$lib/utilities/ActiveTimer';
    import { onMount, onDestroy } from 'svelte';

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

    let {
        device,
        location,
        isActive: externalIsActive,
        detailHref
    } = $props<{
        device: DeviceWithLatestData;
        location?: Location;
        isActive?: boolean;
        detailHref?: string;
    }>();
    
    // Use the isActive prop directly from the parent component
    // This simplifies the component and ensures consistent active status logic
    let isActive = $derived(externalIsActive !== undefined ? Boolean(externalIsActive) : false);
    
    // Log the active status for debugging
    $effect(() => {
        console.log(`[DataRowItem] Device ${device.name} (${device.dev_eui}) isActive: ${isActive}`);
    });
    
    // Determine the primary and secondary data keys based on device type - using reactive declarations
    let primaryDataKey = $derived(device.cw_device_type.primary_data_v2 || 'temperature_c');
    let secondaryDataKey = $derived(device.cw_device_type.secondary_data_v2 || 
        (device.cw_device_type.name?.toLowerCase().includes('soil') ? 'moisture' : 'humidity'));

    // Get the data values - using reactive declarations so they update when latestData changes
    let primaryValue = $derived(device.latestData?.[primaryDataKey]);
    let secondaryValue = $derived(device.latestData?.[secondaryDataKey]);

    // Get the notations - using reactive declarations
    let primaryNotation = $derived(device.cw_device_type.primary_data_notation || '°C');
    let secondaryNotation = $derived(device.cw_device_type.secondary_data_notation || '%');
    
    // Add a reactive effect to log when data changes
    $effect(() => {
        console.log(`DataRowItem: ${device.name} (${device.dev_eui}) data updated:`, {
            primaryKey: primaryDataKey,
            primaryValue,
            secondaryKey: secondaryDataKey,
            secondaryValue,
            timestamp: device.latestData?.created_at
        });
    });

    let localStorageOpenState = localStorage.getItem(`${device.dev_eui}-collapseState`);
    let defaultCollapse = $state(
        localStorageOpenState ? JSON.parse(localStorageOpenState) : false
    );

    function collapseStateChange(e: CustomEvent) {
        defaultCollapse = e.detail.open;
        localStorage.setItem(`${device.dev_eui}-collapseState`, JSON.stringify(e.detail.open));
    }

    $effect(() => {
		$inspect('device', device, 'latestData', device.latestData);
	});
</script>

<Collapse
    classes={{ root: 'mb-1 bg-gray-50/50 dark:bg-gray-800/30 w-full', icon: 'text-gray-400 dark:text-gray-500 data-[open=true]:rotate-90' }}
    open={defaultCollapse}
    on:change={(e) => collapseStateChange(e)}
>
    <div
        slot="trigger"
        class="flex-1 border-l-8 {isActive ? '!border-l-green-500' : 'border-l-red-500'}"
    >
        <div class="my-1 mr-2 border-r-2">
            <div class="flex flex-col text-base">
                <div class="justify-left flex flex-row">
                    <b class="ml-4 text-sm text-gray-700 dark:text-gray-300 font-semibold tracking-wide pb-1">{device.name || `Device ${device.dev_eui}`}</b>
                </div>
                <div class="flex flex-row justify-center ">
                    {#if device.latestData}
                        <p class="m-auto justify-center">
                            <span>
                                <span class="text-gray-500 dark:text-gray-300">{nameToEmoji(primaryDataKey)}</span>
                                <span class="text-gray-900 dark:text-gray-100 font-medium">
                                    <TweenedValue
                                        value={primaryValue}
                                        format="decimal"
                                    />
                                </span>
                            </span>
                            <small>
                                <sup class="text-accent-700 dark:text-accent-400">{primaryNotation}</sup>
                            </small>
                        </p>
                        <p class="m-auto justify-center">
                            <span>
                                {#if secondaryDataKey}
                                    <span class="text-gray-500 dark:text-gray-300">{nameToEmoji(secondaryDataKey)}</span>
                                    <span class="text-gray-900 dark:text-gray-100 font-medium">
                                        <TweenedValue
                                            value={secondaryValue}
                                            format="decimal"
                                        />
                                    </span>
                                {/if}
                            </span>
                            <small>
                                <sup class="text-accent-700 dark:text-accent-400">{secondaryNotation}</sup>
                            </small>
                        </p>
                    {/if}
                </div>
            </div>
        </div>
    </div>
    
    <slot></slot>
    
    <div
        class="border-l-8 pl-2 pb-1 {isActive ? '!border-l-green-500' : 'border-l-red-500'} "
    >
        {#if detailHref || location}
      <Button
  text="View Details"
  iconPath={mdiArrowRight}
  onClick={() => goto(`/app/location/${device.location_id}/devices/${device.dev_eui}/detail`)}
/>
        {/if}
    </div>
</Collapse>