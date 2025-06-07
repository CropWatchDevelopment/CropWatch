// $lib/utilities/dashboardHelpers.ts

export function isSoilSensor(device: any): boolean {
	const deviceName = device.name?.toLowerCase() || '';
	const deviceTypeName = device.deviceType?.name?.toLowerCase() || '';
	if (device.type === 17) return true;
	return (
		deviceName.includes('soil') ||
		deviceName.includes('moisture') ||
		deviceTypeName.includes('soil') ||
		deviceTypeName.includes('moisture') ||
		(device.latestData && 'moisture' in device.latestData)
	);
}

export function isDeviceActive(device: any, deviceActiveStatus: Record<string, boolean | null>): boolean | null {
	if (!device) return false;
	const devEui = device.dev_eui as string;
	
	// Always check the deviceActiveStatus first - this comes from our timer logic
	// This ensures we respect the 35-minute maximum threshold
	if (devEui in deviceActiveStatus) {
		// If the status is null, return null to indicate unknown/loading state
		if (deviceActiveStatus[devEui] === null) {
			return null;
		}
		return Boolean(deviceActiveStatus[devEui]);
	}
	
	// Only use these fallbacks if we don't have timer data
	const uploadInterval = device.upload_interval || device.deviceType?.default_upload_interval || 10;
	
	// Default to inactive for devices with invalid upload intervals
	if (uploadInterval <= 0) {
		return false;
	}
	
	// Only consider device type isActive if we don't have timer data
	if (device.deviceType?.isActive !== undefined) {
		return Boolean(device.deviceType.isActive);
	}
	
	// Default to inactive if we can't determine status
	return false;
}

export function getDeviceActiveStatus(
	devEui: string | null,
	deviceActiveStatus: Record<string, boolean>
): boolean {
	if (!devEui || deviceActiveStatus[devEui] == null) return false;
	return Boolean(deviceActiveStatus[devEui]);
}

export function getLocationActiveStatus(
	location: any,
	deviceActiveStatus: Record<string, boolean>
) {
	if (!location || !location.cw_devices || location.cw_devices.length === 0) {
		return { activeDevices: [], allActive: false, allInactive: false };
	}
	const locationDevices = location.cw_devices;
	const activeDevices = locationDevices.filter((device: any) =>
		isDeviceActive(device, deviceActiveStatus)
	);
	const allActive =
		locationDevices.length > 0 &&
		locationDevices.every((device: any) => isDeviceActive(device, deviceActiveStatus));
	const allInactive =
		locationDevices.length > 0 &&
		locationDevices.every((device: any) => !isDeviceActive(device, deviceActiveStatus));
	return { activeDevices, allActive, allInactive };
}
