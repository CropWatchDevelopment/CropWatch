<script lang="ts">
    import { onMount } from 'svelte';
    import { getUserState } from '$lib/state/user-state.svelte';
    import moment from 'moment';
    import { Button, Card } from 'svelte-ux';
    import Highcharts from 'highcharts';
    import more from 'highcharts/highcharts-more';
    import Chart from '@highcharts/svelte';
    import accessibility from 'highcharts/modules/accessibility';
    import { page } from '$app/stores';
    import CwCalendar from '../UI/CWCalendar.svelte';
    import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';

    // Initialize Highcharts modules
    more(Highcharts);
    accessibility(Highcharts);

    let dataLength = $state(0);
    let userContext = getUserState();
    let location_id: number = +$page.params.location_id; // Note: $page.params returns a string, so we cast it
    let device = $state(
        userContext.allLocations
            .find((loc) => loc.location_id === location_id)
            ?.cw_devices.find((dev) => dev.dev_eui === $page.params.dev_eui)
    );
    
    // Add proper null checks to prevent "Cannot read properties of undefined" errors
    let people_count = $derived(device?.all_data ? device.all_data.map((data) => data?.people_count || 0).reduce((a, b) => a + b, 0) : 0);
    let bicycle_count = $derived(device?.all_data ? device.all_data.map((data) => data?.bicycle_count || 0).reduce((a, b) => a + b, 0) : 0);
    let vehicle_count = $derived(device?.all_data ? device.all_data.map((data) => data?.car_count || 0).reduce((a, b) => a + b, 0) : 0);
    
    $effect(() => {
        if (device && device?.all_data && device?.all_data.length != dataLength) {
            refreshData();
        }
    })

    onMount(() => {
        if (device) {
            userContext.fetchLatestDeviceData(
                device,
                moment().subtract(1, 'month').toDate(),
                moment().toDate()
            );
        }
    });

    const cameraUrl = "https://153.137.8.13:2223/axis-cgi/mjpg/video.cgi?resolution=640x480";
    let displayCalendar = $state(false);

    // Function to refresh data that also resets the calendar display
    function refreshData() {
        if (!device || !device.all_data) return; // Add safety check
        
        // Turn off the calendar
        displayCalendar = false;

        // Optionally, turn it back on after a short delay
        setTimeout(() => {
            displayCalendar = true;
        }, 100); // Small delay to ensure reactivity
        
        dataLength = device.all_data.length;
    }
</script>

<div class="flex flex-row w-full gap-4 mb-6">
    <Card class="w-full p-4 transition-all hover:shadow-lg">
        <div class="flex items-center">
            <div class="text-4xl mr-3">👥</div>
            <div class="flex-grow">
                <p class="text-2xl font-bold">{people_count || 0}</p>
                <p class="text-sm">People detected</p>
            </div>
        </div>
    </Card>
    
    <Card class="w-full p-4 transition-all hover:shadow-lg">
        <div class="flex items-center">
            <div class="text-4xl mr-3">🚲</div>
            <div class="flex-grow">
                <p class="text-2xl font-bold">{bicycle_count || 0}</p>
                <p class="text-sm">Bicycles detected</p>
            </div>
        </div>
    </Card>
    
    <Card class="w-full p-4 transition-all hover:shadow-lg">
        <div class="flex items-center">
            <div class="text-4xl mr-3">🚗</div>
            <div class="flex-grow">
                <p class="text-2xl font-bold">{vehicle_count || 0}</p>
                <p class="text-sm">Vehicles detected</p>
            </div>
        </div>
    </Card>
</div>

<div class="my-4 flex w-full flex-row gap-5">
    {#if cameraUrl}
        <img src={cameraUrl} alt="Axis Camera Stream" />
    {/if}
    <Card class="w-full">
        <Chart
            options={{
                chart: {
                    type: 'line',
                    backgroundColor: 'transparent',
                    height: 500
                },
                title: {
                    text: nameToJapaneseName('Counts'),
                    style: {
                        color: 'orange'
                    }
                },
                legend: {
                    enabled: true
                },
                responsive: {
                    rules: [
                        {
                            condition: {
                                maxHeight: 100
                            },
                            chartOptions: {
                                yAxis: [
                                    {
                                        tickInterval: 10
                                    },
                                    {}
                                ]
                            }
                        }
                    ]
                },
                xAxis: {
                    type: 'datetime',
                    labels: {
                        style: {
                            color: 'orange',
                            fontSize: '20px'
                        },
                        format: '{value:%m/%d - %H:%M}',
                        rotation: 90
                    },
                    title: {
                        text: ''
                    }
                },
                yAxis: [
                    {
                        title: {
                            text: ''
                        },
                        tickAmount: 10,
                        labels: {
                            format: '{value}',
                            style: {
                                color: 'orange',
                                fontSize: '20px'
                            }
                        }
                    },
                    {
                        title: {
                            text: '',
                            style: {
                                color: 'aqua'
                            }
                        },
                        tickAmount: 10,
                        labels: {
                            enabled: device?.all_data?.some((data) => data?.humidity > 0) || false,
                            format: '{value}%',
                            style: {
                                color: 'aqua',
                                fontSize: '20px'
                            }
                        },
                        opposite: true,
                        showEmpty: false
                    }
                ],
                series: [
                    {
                        type: 'spline',
                        name: 'People',
                        yAxis: 0,
                        data:
                            device?.all_data
                                ?.slice()
                                .reverse()
                                .map((data) => [
                                    new Date(moment(data.created_at).utc(true).local()).getTime(),
                                    data.people_count || 0
                                ]) ?? [],
                        tooltip: {
                            valueSuffix: ''
                        },
                        lineWidth: 2,
                        color: 'Yellow'
                    },
                    {
                        type: 'spline',
                        name: 'Cars',
                        yAxis: 0,
                        data:
                            device?.all_data
                                ?.slice()
                                .reverse()
                                .map((data) => [
                                    new Date(moment(data.created_at).utc(true).local()).getTime(),
                                    data.car_count || 0
                                ]) ?? [],
                        tooltip: {
                            valueSuffix: ''
                        },
                        lineWidth: 2,
                        color: 'Red'
                    },
                    {
                        type: 'spline',
                        name: 'Bicycles',
                        yAxis: 0,
                        data:
                            device?.all_data
                                ?.slice()
                                .reverse()
                                .map((data) => [
                                    new Date(moment(data.created_at).utc(true).local()).getTime(),
                                    data.bicycle_count || 0
                                ]) ?? [],
                        tooltip: {
                            valueSuffix: ''
                        },
                        lineWidth: 2,
                        color: 'Blue'
                    }
                ]
            }}
            highcharts={Highcharts}
        />
    </Card>
</div>

{#if device?.all_data && displayCalendar}
    <CwCalendar data={device.all_data} />
{/if}
