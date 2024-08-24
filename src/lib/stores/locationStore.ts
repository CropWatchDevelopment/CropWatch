import { writable } from 'svelte/store';
import { deviceStore } from './deviceStore';

export function createLocationStore() {
    const locations = writable({});

    // Function to fetch all locations and reference the device store
    async function fetchLocations() {
        const locationsResponse = await fetch('/api/v1/locations?includeDevicesTypes=true');
        const locationData = await locationsResponse.json();

        locations.set(locationData);

        // For each location, fetch the data for all devices in that location
        for (const location of locationData) {
            if (location.devices) {
                for (const device of location.devices) {
                    deviceStore.fetchDeviceData(device.dev_eui);
                }
            }
        }
    }

    return {
        subscribe: locations.subscribe,
        fetchLocations
    };
}

export const locationStore = createLocationStore();
