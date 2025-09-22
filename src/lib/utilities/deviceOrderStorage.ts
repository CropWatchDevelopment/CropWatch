/**
 * Device Order Management - handles saving/loading device order from localStorage
 */

export interface DeviceOrder {
	locationId: number;
	deviceOrder: string[]; // Array of dev_eui strings in order
}

const STORAGE_KEY = 'cropwatch_device_order';

/**
 * Save device order for a specific location to localStorage
 */
export function saveDeviceOrder(locationId: number, deviceOrder: string[]): void {
	try {
		if (typeof localStorage === 'undefined') return;

		const existingData = getDeviceOrderData();
		const locationIndex = existingData.findIndex((item) => item.locationId === locationId);

		const newOrderData: DeviceOrder = { locationId, deviceOrder };

		if (locationIndex >= 0) {
			// Update existing location order
			existingData[locationIndex] = newOrderData;
		} else {
			// Add new location order
			existingData.push(newOrderData);
		}

		localStorage.setItem(STORAGE_KEY, JSON.stringify(existingData));
	} catch (error) {
		console.warn('Failed to save device order to localStorage:', error);
	}
}

/**
 * Get device order for a specific location from localStorage
 */
export function getDeviceOrder(locationId: number): string[] | null {
	try {
		if (typeof localStorage === 'undefined') return null;

		const data = getDeviceOrderData();
		const locationData = data.find((item) => item.locationId === locationId);

		return locationData ? locationData.deviceOrder : null;
	} catch (error) {
		console.warn('Failed to load device order from localStorage:', error);
		return null;
	}
}

/**
 * Get all device order data from localStorage
 */
function getDeviceOrderData(): DeviceOrder[] {
	try {
		if (typeof localStorage === 'undefined') return [];

		const data = localStorage.getItem(STORAGE_KEY);
		return data ? JSON.parse(data) : [];
	} catch (error) {
		console.warn('Failed to parse device order data from localStorage:', error);
		return [];
	}
}

/**
 * Apply stored device order to an array of devices
 */
export function applyStoredDeviceOrder<T extends { dev_eui: string }>(
	devices: T[],
	locationId: number
): T[] {
	const storedOrder = getDeviceOrder(locationId);
	if (!storedOrder) return devices;

	// Create a map for quick lookup
	const deviceMap = new Map<string, T>();
	devices.forEach((device) => deviceMap.set(device.dev_eui, device));

	// Build ordered array based on stored order
	const orderedDevices: T[] = [];
	const usedDevices = new Set<string>();

	// First, add devices in stored order
	storedOrder.forEach((devEui) => {
		const device = deviceMap.get(devEui);
		if (device) {
			orderedDevices.push(device);
			usedDevices.add(devEui);
		}
	});

	// Then, add any new devices that weren't in the stored order
	devices.forEach((device) => {
		if (!usedDevices.has(device.dev_eui)) {
			orderedDevices.push(device);
		}
	});

	return orderedDevices;
}

/**
 * Clear all stored device orders
 */
export function clearDeviceOrders(): void {
	try {
		if (typeof localStorage !== 'undefined') {
			localStorage.removeItem(STORAGE_KEY);
		}
	} catch (error) {
		console.warn('Failed to clear device orders from localStorage:', error);
	}
}
