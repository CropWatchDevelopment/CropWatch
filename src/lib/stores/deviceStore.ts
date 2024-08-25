import type { Tables } from '$lib/types/supabaseSchema';
import { writable } from 'svelte/store';
type deviceType = Tables<'cw_devices'>;

export function createDeviceStore() {
    const { subscribe, update, set } = writable({});

    const localStorageKey = 'deviceDataCache';
    const cacheDuration = 5 * 60 * 1000; // 10 minutes in milliseconds

    // Check if we're in the browser environment
    const isBrowser = typeof window !== 'undefined';

    // Load initial data from localStorage (if available)
    const loadFromLocalStorage = () => {
        if (isBrowser) {
            const storedDevices = localStorage.getItem(localStorageKey);
            if (storedDevices) {
                const parsedData = JSON.parse(storedDevices);
                set(parsedData.devices || {}); // Set the devices data from localStorage
            }
        }
    };

    // Save the devices data to localStorage with a timestamp
    const saveToLocalStorage = (devices: deviceType) => {
        if (isBrowser) {
            const cacheData = {
                devices,
                timestamp: Date.now(),
            };
            localStorage.setItem(localStorageKey, JSON.stringify(cacheData));
        }
    };

    // Function to fetch the latest data for a specific device and 24-hour history
    async function fetchDeviceData(deviceId: string) {
        if (isBrowser) {
            // Check if cached data exists and is still valid (within the 10-minute window)
            const cachedData = localStorage.getItem(localStorageKey);
            if (cachedData) {
                const { devices, timestamp } = JSON.parse(cachedData);
                const currentTime = Date.now();

                // Ensure devices exist in cache
                if (!devices[deviceId]) {
                    devices[deviceId] = { latest: {}, history: [] };
                }

                if (devices[deviceId] && currentTime - timestamp < cacheDuration) {
                    // Use the cached data if it's still valid
                    update(() => devices);
                    return;
                }
            }

            // Fetch new data from the API if no valid cache is found
            try {
                // Fetch latest device data
                const latestDataResponse = await fetch(`/api/v1/devices/${deviceId}/latest-data`);
                const latestData = await latestDataResponse.json();

                // Fetch 24-hour history data (optional)
                const historyData = []; // Replace this with actual data if needed

                // Update the device data in the store and cache it
                update((devices) => {
                    const updatedDevices = {
                        ...devices,
                        [deviceId]: {
                            latest: latestData,
                            history: historyData,
                        },
                    };
                    saveToLocalStorage(updatedDevices); // Save the updated data to localStorage with a timestamp
                    return updatedDevices;
                });
            } catch (error) {
                console.error(`Error fetching data for device ${deviceId}:`, error);
            }
        }
    }

    // Function to update a specific device by its ID
    function updateDevice(deviceId: string, payload: object) {
        update((devices) => {
            // Ensure the device exists, if not, initialize it
            const device = devices[deviceId] || { latest: {}, history: [] };

            // Merge the payload into the latest data (customize as needed)
            const updatedDevice = {
                ...device,
                latest: {
                    ...device.latest,
                    ...payload,
                },
            };

            const updatedDevices = {
                ...devices,
                [deviceId]: updatedDevice,
            };

            saveToLocalStorage(updatedDevices); // Save the updated data to localStorage with a timestamp

            return updatedDevices;
        });
    }

    // Load initial data from localStorage when the store is created
    loadFromLocalStorage();

    return {
        subscribe,
        fetchDeviceData,
        updateDevice, // Expose the update function
    };
}

export const deviceStore = createDeviceStore();
