import type { Location } from '$lib/models/Location';
import type { DeviceWithType } from '$lib/models/Device';
import type { AirData } from '$lib/models/AirData';
import type { SoilData } from '$lib/models/SoilData';

// Define DeviceWithSensorData type for use in the store
interface DeviceWithSensorData extends DeviceWithType {
	latestData: AirData | SoilData | null;
	cw_rules?: any[];
}

// Store state
let locations = $state<(Location & { deviceCount: number; cw_devices: DeviceWithSensorData[] })[]>(
	[]
);
let selectedLocationId = $state<number | null>(null);
let loadingLocations = $state(true);
let loadingDevices = $state(false);
let locationError = $state<string | null>(null);
let deviceError = $state<string | null>(null);
let devices = $state<DeviceWithSensorData[]>([]);

// Derived state
const selectedLocation = $derived(
	locations.find((loc) => loc.location_id === selectedLocationId) || null
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
		const locationPromises = userLocations.map(async (location: Location) => {
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

		// Select "All Locations" by default (null)
		await selectLocation(null);
		//console.log('LocationsStore: Initially selected All Locations (null)');
		// Note: We're no longer auto-selecting the first location by default

		return locations;
	} catch (err) {
		locationError = err instanceof Error ? err.message : 'Unknown error occurred';
		loadingLocations = false;
		return [];
	}
}

// Function to select a location and load its devices
async function selectLocation(locationId: number | null) {
	selectedLocationId = locationId;
	if (locationId === null) {
		// For "All Locations", aggregate devices from all locations
		await loadAllDevices();
	} else {
		// For specific location, load devices for that location
		await loadDevicesForLocation(locationId);
	}
	return devices;
}

// Function to load all devices from all locations
async function loadAllDevices() {
	try {
		loadingDevices = true;
		deviceError = null;

		const allDevices: DeviceWithSensorData[] = [];
		for (const location of locations) {
			if (location.cw_devices && location.cw_devices.length > 0) {
				allDevices.push(...location.cw_devices);
			}
		}

		devices = allDevices;
		loadingDevices = false;
		return devices;
	} catch (error) {
		console.error('Error loading all devices:', error);
		deviceError = 'Failed to load devices from all locations';
		loadingDevices = false;
		return [];
	}
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

function updateSingleDevice(devEui: string, updatedData: AirData | SoilData) {
	if (!devEui || !updatedData) return;

	// Filter out null values and unwanted properties
	const newData = Object.fromEntries(
		Object.entries(updatedData).filter(
			([k, v]) => v != null && k !== 'is_simulated' && k !== 'dev_eui'
		)
	) as AirData | SoilData;

	console.log('Updating device:', devEui, 'with data:', newData);
	// Update device in the devices array (current view)
	if (devices && devices.length > 0) {
		const deviceIndex = devices.findIndex((dev) => dev.dev_eui === devEui);
		if (deviceIndex >= 0) {
			console.log('Old Data:', devices[deviceIndex].latestData);
			// Create a new device object to ensure reactivity
			devices[deviceIndex] = {
				...devices[deviceIndex],
				latestData: newData
			};
		}
	}

	// Also update the device in the locations array to keep data consistent
	if (locations && locations.length > 0) {
		for (const location of locations) {
			if (location.cw_devices && location.cw_devices.length > 0) {
				const deviceIndex = location.cw_devices.findIndex((dev) => dev.dev_eui === devEui);
				if (deviceIndex >= 0) {
					// Create a new device object to ensure reactivity
					location.cw_devices[deviceIndex] = {
						...location.cw_devices[deviceIndex],
						latestData: newData
					};
					// Trigger reactivity by reassigning the array
					location.cw_devices = [...location.cw_devices];
					break;
				}
			}
		}
		// Trigger reactivity by reassigning the locations array
		locations = [...locations];
	}
}

// Export the store functions and state
export function getLocationsStore() {
	return {
		// State
		get locations() {
			return locations;
		},
		get selectedLocationId() {
			return selectedLocationId;
		},
		get selectedLocation() {
			return selectedLocation;
		},
		get loadingLocations() {
			return loadingLocations;
		},
		get loadingDevices() {
			return loadingDevices;
		},
		get locationError() {
			return locationError;
		},
		get deviceError() {
			return deviceError;
		},
		get devices() {
			return devices;
		},

		// Methods
		fetchLocations,
		selectLocation,
		loadDevicesForLocation,
		loadAllDevices,
		refreshDevicesForLocation,
		updateLocationDevices,
		updateSingleDevice
	};
}
