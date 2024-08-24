import { writable } from 'svelte/store';

export function createDeviceStore() {
    const devices = writable({});

    // Function to fetch the latest data for a specific device and 24-hour history
    async function fetchDeviceData(deviceId: string) {
        // Fetch the latest data for the device
        const latestDataResponse = await fetch(`/api/v1/devices/${deviceId}/latest-data`);
        const latestData = await latestDataResponse.json();

        // Fetch 24 hours of data for the device
        // const historyDataResponse = await fetch(`/api/device/${deviceId}/history?hours=24`);
        // const historyData = await historyDataResponse.json();

        devices.update((currentData) => ({
            ...currentData,
            [deviceId]: {
                latest: latestData,
                history: []
            }
        }));
    }

    return {
        subscribe: devices.subscribe,
        fetchDeviceData
    };
}

export const deviceStore = createDeviceStore();
