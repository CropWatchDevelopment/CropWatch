// $lib/utilities/deviceTimerManager.ts
import { createActiveTimer } from './ActiveTimer';
import type { DeviceWithType } from '$lib/models/Device';
import type { AirData } from '$lib/models/AirData';
import type { SoilData } from '$lib/models/SoilData';

// Define DeviceWithSensorData type
interface DeviceWithSensorData extends DeviceWithType {
	latestData: AirData | SoilData | null;
	cw_rules?: any[];
}

// Type for the callback function that will be called when a device's active status changes
type DeviceStatusCallback = (deviceId: string, isActive: boolean | null) => void;

// Type for the refresh callback function that will be called during polling
type RefreshCallback = (locationId: number) => Promise<boolean>;

/**
 * DeviceTimerManager class to manage device active timers and polling intervals
 * This class encapsulates all the logic for setting up, cleaning up, and managing device active timers and polling
 */
export class DeviceTimerManager {
	// Map to track device timers by device ID
	private deviceTimers: Record<string, number> = {};

	// Array to store unsubscribe functions for active timers
	private unsubscribers: (() => void)[] = [];

	// Map to track device active status by device ID
	private deviceActiveStatus: Record<string, boolean | null> = {};

	// Polling interval ID
	private pollingIntervalId: number | null = null;

	// Map to track last refresh timestamp by location ID
	private lastRefreshTimestamp: Record<number, number> = {};

	/**
	 * Set up a device active timer for a specific device
	 * @param device The device to set up the timer for
	 * @param uploadInterval The upload interval in minutes
	 * @param onStatusChange Optional callback to call when the device active status changes
	 */
	setupDeviceActiveTimer(
		device: DeviceWithSensorData,
		uploadInterval: number,
		onStatusChange?: (deviceId: string, isActive: boolean | null) => void
	): void {
		const deviceId = device.dev_eui as string;
		const lastUpdated = device.last_data_updated_at ?? null;

		if (!lastUpdated) {
			this.cleanupDeviceTimer(deviceId);
			this.deviceActiveStatus[deviceId] = null;
			if (onStatusChange) {
				onStatusChange(deviceId, null);
			}
			return;
		}

		// Clear any existing timer for this device
		this.cleanupDeviceTimer(deviceId);

		// Use provided uploadInterval or fallback to device settings
		const effectiveInterval = Number(
			uploadInterval ||
				device.upload_interval ||
				device.cw_device_type?.default_upload_interval ||
				0
		);

		if (!effectiveInterval || effectiveInterval <= 0) {
			this.deviceActiveStatus[deviceId] = null;
			if (onStatusChange) {
				onStatusChange(deviceId, null);
			}
			return;
		}

		const currentTimestamp = lastUpdated;

		const activeTimer = createActiveTimer(new Date(currentTimestamp), effectiveInterval);

		// Update device active status when timer changes
		const unsubscribe = activeTimer.subscribe((isActive) => {
			const latestTimestamp = device.last_data_updated_at ?? null;
			if (latestTimestamp === currentTimestamp) {
				this.deviceActiveStatus[deviceId] = isActive;

				if (onStatusChange) {
					onStatusChange(deviceId, isActive);
				}
			}
		});

		// Store the unsubscribe function for cleanup and track its index
		const timerIndex = this.unsubscribers.length;
		this.unsubscribers.push(unsubscribe);
		this.deviceTimers[deviceId] = timerIndex;
	}
	/**
	 * Clean up a device timer
	 * @param deviceId The ID of the device to clean up the timer for
	 */
	cleanupDeviceTimer(deviceId: string) {
		// Find the index of the timer for this device
		const timerIndex = this.deviceTimers[deviceId];

		// If we have a timer index for this device
		if (timerIndex !== undefined && timerIndex >= 0 && timerIndex < this.unsubscribers.length) {
			// Call the unsubscribe function
			this.unsubscribers[timerIndex]();

			// Remove the unsubscribe function from the array (replace with a no-op)
			this.unsubscribers[timerIndex] = () => {};

			// Remove the device from the timers map
			delete this.deviceTimers[deviceId];
		}
	}

	/**
	 * Clean up all device timers
	 */
	cleanupTimers() {
		// Call all unsubscribe functions
		this.unsubscribers.forEach((unsub) => unsub());

		// Clear the arrays
		this.unsubscribers = [];
		this.deviceTimers = {};
	}

	/**
	 * Set up polling for a location
	 * @param locationId The ID of the location to poll for
	 * @param refreshCallback The callback function to call when polling
	 * @param intervalMs Optional polling interval in milliseconds (default: 120000 - 2 minutes)
	 */
	setupPolling(locationId: number, refreshCallback: RefreshCallback, intervalMs: number = 120000) {
		//console.log('setupPolling called');
		// Clean up any existing polling interval
		this.cleanupPolling();

		// Set up new polling interval
		const intervalId = setInterval(async () => {
			//console.log(`[Polling] Device data polling triggered at ${new Date().toLocaleString()}`);
			if (locationId) {
				await refreshCallback(locationId);
			}
		}, intervalMs);

		// Store the interval ID for cleanup
		this.pollingIntervalId = intervalId as unknown as number;
	}

	/**
	 * Clean up polling interval
	 */
	cleanupPolling() {
		if (this.pollingIntervalId !== null) {
			clearInterval(this.pollingIntervalId);
			this.pollingIntervalId = null;
		}
	}

	/**
	 * Update the last refresh timestamp for a location
	 * @param locationId The ID of the location
	 * @param timestamp The timestamp to set (default: current time)
	 */
	updateRefreshTimestamp(locationId: number, timestamp: number = Date.now()) {
		this.lastRefreshTimestamp[locationId] = timestamp;
	}

	/**
	 * Get the last refresh timestamp for a location
	 * @param locationId The ID of the location
	 * @returns The last refresh timestamp, or 0 if the location has never been refreshed
	 */
	getLastRefreshTimestamp(locationId: number): number {
		return this.lastRefreshTimestamp[locationId] || 0;
	}

	/**
	 * Check if a location needs to be refreshed based on a minimum interval
	 * @param locationId The ID of the location
	 * @param minIntervalMs The minimum interval in milliseconds (default: 30000 - 30 seconds)
	 * @returns True if the location needs to be refreshed, false otherwise
	 */
	needsRefresh(locationId: number, minIntervalMs: number = 30000): boolean {
		const now = Date.now();
		const lastRefresh = this.getLastRefreshTimestamp(locationId);
		const timeSinceLastRefresh = now - lastRefresh;

		return timeSinceLastRefresh >= minIntervalMs;
	}

	/**
	 * Get the active status for a specific device
	 * @param deviceId The device ID to get the active status for
	 * @returns The active status of the device, or false if not found
	 */
	getDeviceActiveStatus(deviceId: string): boolean | null | undefined {
		return this.deviceActiveStatus[deviceId];
	}

	/**
	 * Get a record of all device active statuses
	 * @returns A record of device active statuses by device ID
	 */
	getDeviceActiveStatusRecord(): Record<string, boolean | null> {
		return { ...this.deviceActiveStatus };
	}
}

/**
 * Creates a new DeviceTimerManager instance
 * @returns A new DeviceTimerManager instance
 */
export function createDeviceTimerManager(): DeviceTimerManager {
	return new DeviceTimerManager();
}
