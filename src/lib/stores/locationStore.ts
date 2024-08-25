import { writable } from 'svelte/store';
import { deviceStore } from './deviceStore';

export function createLocationStore() {
    const { subscribe, set, update } = writable([]);

    const cacheDuration = 60 * 60 * 1000; // 1 hour in milliseconds
    const localStorageKey = 'locations';
    const localStorageCacheTimeKey = 'locationsCacheTime';

    // Function to fetch all locations, either from localStorage or API
    async function fetchLocations() {
        const cachedLocations = localStorage.getItem(localStorageKey);
        const cacheTime = localStorage.getItem(localStorageCacheTimeKey);
        const currentTime = Date.now();

        // Check if cached data is available and not expired
        if (cachedLocations && cacheTime && currentTime - parseInt(cacheTime) < cacheDuration) {
            const locations = JSON.parse(cachedLocations);
            set(locations); // Use cached locations
            locations.forEach(loadDevicesForLocation); // Load devices for each location from cache or API
            return;
        }

        // Fetch locations from API if cache is expired or doesn't exist
        try {
            const response = await fetch('/api/v1/locations?includeDevicesTypes=true');
            if (!response.ok) {
                throw new Error('Failed to fetch locations');
            }
            const data = await response.json();
            set(data); // Update the store with fetched locations

            // Cache the locations and the current timestamp
            localStorage.setItem(localStorageKey, JSON.stringify(data));
            localStorage.setItem(localStorageCacheTimeKey, `${Date.now()}`);

            // Load associated devices asynchronously for each location
            data.forEach(loadDevicesForLocation);
        } catch (error) {
            console.error('Error fetching locations:', error);
        }
    }

    // Function to load devices for a specific location and cache them
    async function loadDevicesForLocation(location) {
        try {
            const cachedLocations = JSON.parse(localStorage.getItem(localStorageKey) || '{}');
            const cachedLocation = cachedLocations.find(loc => loc.location_id === location.location_id);

            // If devices are already cached, use them
            if (cachedLocation && cachedLocation.devices) {
                update((locations) =>
                    locations.map((loc) =>
                        loc.location_id === location.location_id ? { ...loc, devices: cachedLocation.devices } : loc
                    )
                );
                cachedLocation.devices.forEach((device) => {
                    deviceStore.fetchDeviceData(device.dev_eui);
                });
                return;
            }

            // Fetch devices from the API if not cached
            const response = await fetch(`/api/v1/devices/location/${location.location_id}?includeDevicesTypes=true`);
            if (!response.ok) {
                throw new Error('Failed to fetch devices for location');
            }

            const devices = await response.json();

            // Update the location with its devices
            update((locations) => {
                const updatedLocations = locations.map((loc) =>
                    loc.location_id === location.location_id ? { ...loc, devices } : loc
                );

                // Update the cached locations in localStorage
                localStorage.setItem(localStorageKey, JSON.stringify(updatedLocations));

                return updatedLocations;
            });

            // Fetch device data asynchronously for each device
            if (devices && Array.isArray(devices)) {
                for (const device of devices) {
                    deviceStore.fetchDeviceData(device.dev_eui).catch((error) => {
                        console.error(`Failed to fetch data for device ${device.dev_eui}:`, error);
                    });
                }
            }

        } catch (error) {
            console.error(`Error fetching devices for location ${location.location_id}:`, error);
        }
    }

    return {
        subscribe,
        fetchLocations,
        loadDevicesForLocation
    };
}

export const locationStore = createLocationStore();
