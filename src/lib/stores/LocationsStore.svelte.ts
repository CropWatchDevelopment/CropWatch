import type { DeviceWithSensorData } from '$lib/types/devices';
import type { Location } from '$lib/types/locations';

// Store state
let locations = $state<(Location & { deviceCount: number; cw_devices: DeviceWithSensorData[] })[]>([]);
let selectedLocationId = $state<number | null>(null);
let loadingLocations = $state(true);
let loadingDevices = $state(false);
let locationError = $state<string | null>(null);
let deviceError = $state<string | null>(null);
let devices = $state<DeviceWithSensorData[]>([]);

// Derived state
const selectedLocation = $derived(
  locations.find(loc => loc.location_id === selectedLocationId) || null
);

// Function to fetch all locations for a user
async function fetchLocations(userId: string) {
  try {
    loadingLocations = true;
    locationError = null;
    
    const response = await fetch(`/api/locations?userId=${userId}`);
    if (!response.ok) throw new Error('Failed to fetch location data');

    const userLocations = await response.json();

    // Process locations and load devices for each location
    const locationPromises = userLocations.map(async (location) => {
      try {
        // Fetch devices for this location
        const devicesResponse = await fetch(`/api/locations/${location.location_id}/devices`);
        if (!devicesResponse.ok) return { ...location, deviceCount: 0, cw_devices: [] };

        const locationDevices = await devicesResponse.json();

        return {
          ...location,
          deviceCount: locationDevices.length,
          cw_devices: locationDevices
        };
      } catch (error) {
        console.error(`Error loading devices for location ${location.location_id}:`, error);
        return { ...location, deviceCount: 0, cw_devices: [] };
      }
    });

    // Wait for all location device data to be loaded
    locations = await Promise.all(locationPromises);
    loadingLocations = false;

    // If there are locations, select the first one by default
    if (userLocations.length > 0) {
      await selectLocation(userLocations[0].location_id);
    }
    
    return locations;
  } catch (err) {
    locationError = err instanceof Error ? err.message : 'Unknown error occurred';
    loadingLocations = false;
    return [];
  }
}

// Function to select a location and load its devices
async function selectLocation(locationId: number) {
  selectedLocationId = locationId;
  await loadDevicesForLocation(locationId);
  return devices;
}

// Function to load devices for a specific location
async function loadDevicesForLocation(locationId: number) {
  try {
    // Reset any previous device error
    deviceError = null;

    // Show loading indicator for devices
    loadingDevices = true;
    devices = [];

    // Fetch devices for the selected location
    const response = await fetch(`/api/locations/${locationId}/devices`);
    if (!response.ok) throw new Error('Failed to fetch devices');

    const locationDevices = await response.json();
    devices = locationDevices;

    // Update the location's devices to trigger UI refresh
    updateLocationDevices(locationId, devices);
    
    loadingDevices = false;
    return devices;
  } catch (err) {
    deviceError = err instanceof Error ? err.message : 'Unknown error occurred';
    loadingDevices = false;
    return [];
  }
}

// Function to refresh devices for a location without changing the selected location
async function refreshDevicesForLocation(locationId: number) {
  try {
    // Fetch devices for the selected location
    const response = await fetch(`/api/locations/${locationId}/devices`);
    if (!response.ok) throw new Error('Failed to fetch devices');

    const locationDevices = await response.json();
    devices = locationDevices;

    // Update the location's devices to trigger UI refresh
    updateLocationDevices(locationId, devices);

    return true;
  } catch (err) {
    console.error('Error refreshing devices:', err);
    return false;
  }
}

// Function to update the location's devices and trigger a UI refresh
function updateLocationDevices(locationId: number, updatedDevices: DeviceWithSensorData[]) {
  if (locations && locations.length > 0) {
    const currentLocationIndex = locations.findIndex((loc) => loc.location_id === locationId);
    if (currentLocationIndex >= 0) {
      locations[currentLocationIndex].cw_devices = [...updatedDevices];
    }
  }
}

// Export the store functions and state
export function getLocationsStore() {
  return {
    // State
    get locations() { return locations; },
    get selectedLocationId() { return selectedLocationId; },
    get selectedLocation() { return selectedLocation; },
    get loadingLocations() { return loadingLocations; },
    get loadingDevices() { return loadingDevices; },
    get locationError() { return locationError; },
    get deviceError() { return deviceError; },
    get devices() { return devices; },
    
    // Methods
    fetchLocations,
    selectLocation,
    loadDevicesForLocation,
    refreshDevicesForLocation,
    updateLocationDevices
  };
}
