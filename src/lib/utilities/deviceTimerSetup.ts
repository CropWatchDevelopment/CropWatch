import { DeviceTimerManager } from './deviceTimerManager';
import { getDeviceLatestTimestamp } from './deviceUtils';
import type { DeviceWithType } from '$lib/models/Device';
import type { AirData } from '$lib/models/AirData';
import type { SoilData } from '$lib/models/SoilData';

// Define the DeviceWithSensorData type
export interface DeviceWithSensorData extends DeviceWithType {
	latestData: AirData | SoilData | null;
	cw_rules?: any[];
}

/**
 * Sets up an active timer for a device to track its online/offline status
 * @param device The device to set up a timer for
 * @param timerManager The timer manager instance
 * @param deviceActiveStatus The record of device active status
 */
export function setupDeviceActiveTimer(
	device: DeviceWithSensorData,
	timerManager: DeviceTimerManager,
	deviceActiveStatus: Record<string, boolean | null>
) {
	const latestTimestamp = getDeviceLatestTimestamp(device);
	if (!latestTimestamp) return;
	const deviceId = device.dev_eui as string;

	// Get the upload interval from the device
	const uploadInterval =
		device.upload_interval || device.cw_device_type?.default_upload_interval || 10;

	// Use the timer manager to set up a timer for this device
	timerManager.setupDeviceActiveTimer(
		device,
		uploadInterval,
		(deviceId: string, isActive: boolean | null) => {
			// Update the device active status in our component state
			deviceActiveStatus[deviceId] = isActive === null ? false : isActive;
		}
	);
}
