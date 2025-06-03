<!--
  DeviceCards.svelte
  A component that displays a grid, list, or mosaic of device cards
-->
<script lang="ts">
  import type { DeviceWithSensorData } from '$lib/types';
  import DashboardCard from '$lib/components/UI/dashboard/DashboardCard.svelte';
  import DataRowItem from '$lib/components/UI/dashboard/DataRowItem.svelte';
  import DeviceDataList from '$lib/components/UI/dashboard/DeviceDataList.svelte';
  import { isDeviceActive, isSoilSensor } from '$lib/utilities/deviceUtils';
  import { getContainerClass } from '$lib/utilities/dashboardLayout';

  // Props
  export let devices: DeviceWithSensorData[] = [];
  export let viewType: string = 'grid';
  export let deviceActiveStatus: Record<string, boolean> = {};
  export let selectedDevice: string | null = null;

  // Function to handle device selection
  function selectDevice(deviceId: string) {
    // Emit a custom event to notify parent component
    const event = new CustomEvent('deviceSelect', { detail: { deviceId } });
    dispatch('deviceSelect', { deviceId });
  }

  // Function to create a dispatch method for custom events
  function createEventDispatcher() {
    return {
      dispatch: (event: string, detail: any) => {
        const customEvent = new CustomEvent(event, { detail });
        document.dispatchEvent(customEvent);
      }
    };
  }
  const { dispatch } = createEventDispatcher();
</script>

<div class="device-cards-grid {getContainerClass(viewType)}">
  {#each devices as device (device.dev_eui)}
    <div class="device-card-wrapper">
      {#if viewType === 'list'}
        <div 
          onclick={() => selectDevice(device.dev_eui)} 
          class="cursor-pointer"
          class:selected={selectedDevice === device.dev_eui}
        >
          <DataRowItem
            device={device}
            isActive={isDeviceActive(device, deviceActiveStatus)}
            isSoil={isSoilSensor(device)}
            detailHref={`/app/devices/${device.dev_eui}`}
          />
        </div>
      {:else}
        <div 
          onclick={() => selectDevice(device.dev_eui)}
          class="cursor-pointer"
          class:selected={selectedDevice === device.dev_eui}
        >
          <DashboardCard
            device={device}
            isActive={isDeviceActive(device, deviceActiveStatus)}
            isSoil={isSoilSensor(device)}
            detailHref={`/app/devices/${device.dev_eui}`}
          >
            <DeviceDataList slot="content" {device} />
          </DashboardCard>
        </div>
      {/if}
    </div>
  {/each}
</div>

<style>
  .device-cards-grid.columns-[20rem] {
    column-gap: 1rem;
  }

  .device-cards-grid.columns-[20rem] > div {
    break-inside: avoid;
    margin-bottom: 1rem;
  }

  .device-cards-grid.columns-[20rem] :global(.dashboard-card) {
    height: 100%;
  }

  .device-card-wrapper {
    position: relative;
  }

  .device-cards-grid.flex .device-card-wrapper {
    width: 100%;
    max-width: 100%;
  }

  .device-cards-grid.flex .device-card-wrapper :global(.dashboard-card) {
    width: 100%;
    max-width: 100%;
  }

  .device-cards-grid.columns-[20rem] .device-card-wrapper {
    display: inline-block;
    width: 100%;
  }

  .selected {
    outline: 2px solid #3b82f6;
    border-radius: 0.375rem;
  }
</style>
