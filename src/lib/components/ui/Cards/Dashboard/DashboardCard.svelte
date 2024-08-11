<script lang="ts">
    import { Button, Collapse, ProgressCircle } from 'svelte-ux';
    import { goto } from '$app/navigation';
    import { mdiArrowRight } from '@mdi/js';
    import { nameToEmoji } from '../../utilities/NameToEmoji';
    import DeviceDataList from './DeviceDataList.svelte';
    import devicesStore from '$lib/stores/devicesStore';
	import { get, writable } from 'svelte/store';

    export let location;

    const locationId = location.location_id;
    let locationWeatherData = writable(null);
    let devicesLatestData = devicesStore;

    $: if (location.devices) {
        const updatedDevicesLatestData = get(devicesStore);
        devicesLatestData.set(updatedDevicesLatestData);
    }
</script>

<div class="rounded-2xl border-[0.1em] border-[#D2D2D2] bg-surface-content/30 p-0.5">
    <div
        class="custom-bg relative h-20 w-full rounded-2xl bg-cover bg-bottom bg-no-repeat bg-blend-overlay"
    >
        <div class="absolute right-0 top-0 h-full w-1/2 rounded-2xl bg-gradient-to-l from-black"></div>
        <div class="absolute right-3 top-4 space-y-1 text-xs text-white drop-shadow-md">
            {#if $locationWeatherData}
                <p>Rainfall: {$locationWeatherData.rainfall}mm/h</p>
                <p>Humidity: {$locationWeatherData.humidity}%</p>
                <p>Wind Speed: {$locationWeatherData.windSpeed} km/h</p>
            {:else}
                <p>Rainfall: --%</p>
                <p>Humidity: --%</p>
                <p>Wind Speed: -- km/h</p>
            {/if}
        </div>
        <div class="absolute left-3 top-5">
            <p class="text-shadow flex text-3xl text-white">
                {#if $locationWeatherData}
                    {$locationWeatherData.temperature}<span class="text-xl text-gray-100 drop-shadow-md"
                        >ºC</span
                    >
                {:else}
                    --<span class="text-xl text-gray-100 drop-shadow-md">ºC</span>
                {/if}
            </p>
        </div>
    </div>

    <h2 class="primary-text my-3 flex flex-row items-center text-xl">
        {location.name}
        <span class="flex flex-grow" />
        <Button
            variant="outline"
            color="primary"
            icon={mdiArrowRight}
            on:click={() => goto(`/app/locations/${locationId}`)}
        />
    </h2>
    <div class="flex flex-col gap-1 px-1 pb-4 text-sm">
        {#each location.devices as device}
            <Collapse classes={{ root: 'shadow-md pr-2 bg-primary' }}>
                <DeviceDataList data={$devicesLatestData[device.dev_eui]} />
                <div
                    slot="trigger"
                    class="flex-1 border-l-8 {(
                        $devicesLatestData[device.dev_eui] ? $devicesLatestData[device.dev_eui].isDataOld : true
                    )
                        ? '!border-l-red-500'
                        : '!border-l-green-500'}"
                >
                    <div class="my-1 mr-2 border-r-2">
                        <div class="flex flex-col text-center text-base">
                            <div class="justify-left flex flex-row">
                                <b class="ml-4 text-sm">{device.name}</b>
                            </div>
                            {#if $devicesLatestData[device.dev_eui]}
                                <div class="flex flex-row justify-center">
                                    <p class="m-auto justify-center">
                                        <span>
                                            {nameToEmoji(device.deviceType.primary_data)}
                                            {$devicesLatestData[device.dev_eui][device.deviceType.primary_data]}
                                        </span>
                                        <small class="text-slate-800">
                                            <sup>{device.deviceType.primary_data_notation}</sup>
                                        </small>
                                    </p>
                                    {#if device.deviceType.secondary_data}
                                        <p class="m-auto justify-center">
                                            <span>
                                                {nameToEmoji(device.deviceType.secondary_data)}
                                                {$devicesLatestData[device.dev_eui][device.deviceType.secondary_data]}
                                            </span>
                                            <small class="text-slate-800">
                                                <sup>{device.deviceType.secondary_data_notation}</sup>
                                            </small>
                                        </p>
                                    {/if}
                                </div>
                            {:else}
                            <div class="flex flex-row">
                                <ProgressCircle />
                                <p>Loading data...</p>
                            </div>
                            {/if}
                        </div>
                    </div>
                </div>
                <div class="pl-4">
                    <Button
                        on:click={() => goto(`app/devices/${device.dev_eui}/data`)}
                        variant="fill"
                        color="info"
                        class="mb-1 w-full"
                        icon={mdiArrowRight}
                    >
                        View Data
                    </Button>
                </div>
            </Collapse>
        {/each}
    </div>
</div>
<style>
    .text-shadow {
        text-shadow: black 5px 5px 3px;
    }
    .custom-bg::before {
        content: ' ';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-image: url($lib/images/weather/sunny_clouds.png);
        background-size: cover;
        background-position: center;
        filter: blur(1px) grayscale(20%);
    }
</style>
