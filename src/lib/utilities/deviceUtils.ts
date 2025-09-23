/**
 * Device utility functions
 */

/**
 * Determines if a device is a soil sensor based on its type, name, or data
 * @param device - The device to check
 * @returns boolean indicating if the device is a soil sensor
 */
export function isSoilSensor(device: any): boolean {
	// Check device name for soil-related terms
	const deviceName = device.name?.toLowerCase() || '';
	const deviceTypeName = device.deviceType?.name?.toLowerCase() || '';

	// Check device type (type 17 is soil sensor in your system)
	if (device.type === 17) {
		return true;
	}

	// Check if the device name or type contains soil-related terms
	return (
		deviceName.includes('soil') ||
		deviceName.includes('moisture') ||
		deviceTypeName.includes('soil') ||
		deviceTypeName.includes('moisture') ||
		// Check if the device has soil-specific data points
		(device.latestData && 'moisture' in device.latestData)
	);
}

/**
 * Checks if a device is currently active based on its last update time and upload interval
 * @param device - The device to check
 * @param deviceActiveStatus - Record of device active statuses by device ID
 * @returns boolean indicating if the device is active
 */
export function isDeviceActive(
	device: any,
	deviceActiveStatus: Record<string, boolean | null | undefined>
): boolean | null | undefined {
	if (!device) return undefined;

	const devEui = device.dev_eui as string;

	if (devEui && Object.prototype.hasOwnProperty.call(deviceActiveStatus, devEui)) {
		return deviceActiveStatus[devEui];
	}

	const lastUpdated = device.last_data_updated_at ?? null;
	if (!lastUpdated) {
		return null;
	}

	const uploadInterval =
		device.upload_interval ||
		device.cw_device_type?.default_upload_interval ||
		device.deviceType?.default_upload_interval ||
		0;

	if (!uploadInterval || uploadInterval <= 0) {
		return null;
	}

	const diffMs = Date.now() - new Date(lastUpdated).getTime();
	return diffMs < uploadInterval * 60 * 1000;
}

/**
 * Gets active status indicators for a location
 * @param location - The location to check
 * @param deviceActiveStatus - Record of device active statuses by device ID
 * @returns Object with active devices array and status flags
 */
export function getLocationActiveStatus(
	location: any,
	deviceActiveStatus: Record<string, boolean | null | undefined>
) {
	if (!location || !location.cw_devices || location.cw_devices.length === 0) {
		return { activeDevices: [], allActive: false, allInactive: false };
	}

	const locationDevices = location.cw_devices;
	// Use isDeviceActive instead of getDeviceActiveStatus for consistency
	const activeDevices = locationDevices.filter((device: any) =>
		isDeviceActive(device, deviceActiveStatus)
	);

	const allActive =
		locationDevices.length > 0 &&
		locationDevices.every((device: any) => isDeviceActive(device, deviceActiveStatus) === true);

	const allInactive =
		locationDevices.length > 0 &&
		locationDevices.every((device: any) => isDeviceActive(device, deviceActiveStatus) === false);

	return { activeDevices, allActive, allInactive };
}
