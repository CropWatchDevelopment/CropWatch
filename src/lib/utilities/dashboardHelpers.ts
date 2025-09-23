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

export function getDeviceActiveStatus(
	devEui: string | null,
	deviceActiveStatus: Record<string, boolean | null | undefined>
): boolean {
	if (!devEui) return false;
	return deviceActiveStatus[devEui] === true;
}

export function getLocationActiveStatus(
	location: any,
	deviceActiveStatus: Record<string, boolean | null | undefined>
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
		locationDevices.every((device: any) => isDeviceActive(device, deviceActiveStatus) === true);
	const allInactive =
		locationDevices.length > 0 &&
		locationDevices.every((device: any) => isDeviceActive(device, deviceActiveStatus) === false);
	return { activeDevices, allActive, allInactive };
}
