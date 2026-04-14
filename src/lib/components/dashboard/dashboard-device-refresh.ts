import { ApiService } from '$lib/api/api.service';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	applyDashboardLatestReadings,
	mapDashboardPrimaryDataToDevice,
	mergeDashboardDevices
} from './dashboard-device-data';

export const DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES = 10.3;
export const DASHBOARD_DEVICE_REFRESH_INTERVAL_MS =
	DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES * 60_000;

interface DashboardDeviceRefreshApp {
	accessToken?: string;
	devices: IDevice[];
}

interface DashboardDeviceRefreshApi {
	getDeviceLatestPrimaryData(devEui: string): Promise<Record<string, unknown>>;
}

interface RefreshDashboardDeviceOptions {
	app: DashboardDeviceRefreshApp;
	devEui: string;
	targetDevice?: IDevice;
	api?: DashboardDeviceRefreshApi;
}

/**
 * Returns the ms timestamp of the most recent device activity.
 * Prefers cw_devices.last_data_updated_at over the sensor reading created_at.
 */
function getLastSeenMs(device: Pick<IDevice, 'created_at' | 'last_data_updated_at'>): number {
	const d = device.last_data_updated_at ?? device.created_at;
	return d instanceof Date ? d.getTime() : new Date(String(d)).getTime();
}

/**
 * Resolve the effective upload interval for a device in milliseconds.
 * Falls back to DASHBOARD_DEVICE_REFRESH_INTERVAL_MS when no interval is set.
 */
export function resolveDeviceRefreshIntervalMs(uploadIntervalMinutes?: number | null): number {
	if (uploadIntervalMinutes != null && uploadIntervalMinutes > 0) {
		return uploadIntervalMinutes * 60_000;
	}
	return DASHBOARD_DEVICE_REFRESH_INTERVAL_MS;
}

export function isDashboardDeviceOffline(
	device: Pick<IDevice, 'created_at' | 'last_data_updated_at' | 'has_primary_data'>,
	uploadIntervalMinutes?: number | null
): boolean {
	if (device.has_primary_data === false) {
		return true;
	}

	const lastSeenMs = getLastSeenMs(device);
	const thresholdMs = resolveDeviceRefreshIntervalMs(uploadIntervalMinutes) + 60_000;
	return !Number.isFinite(lastSeenMs) || lastSeenMs < Date.now() - thresholdMs;
}

export function getDashboardDeviceNextRefreshDelayMs(
	device: Pick<IDevice, 'created_at' | 'last_data_updated_at' | 'has_primary_data'>,
	uploadIntervalMinutes?: number | null,
	nowMs = Date.now()
): number | null {
	if (device.has_primary_data === false) {
		return null;
	}

	const lastSeenMs = getLastSeenMs(device);
	if (!Number.isFinite(lastSeenMs)) {
		return null;
	}

	const intervalMs = resolveDeviceRefreshIntervalMs(uploadIntervalMinutes);
	const elapsedMs = Math.max(0, nowMs - lastSeenMs);
	const intervalsElapsed = Math.floor(elapsedMs / intervalMs);
	return intervalMs * (intervalsElapsed + 1) - elapsedMs;
}

export async function refreshDashboardDevice({
	app,
	devEui,
	targetDevice,
	api
}: RefreshDashboardDeviceOptions): Promise<IDevice | null> {
	if (!devEui || !app.accessToken) {
		return null;
	}

	const latestApi =
		api ??
		new ApiService({
			authToken: app.accessToken
		});
	const latestDevice = mapDashboardPrimaryDataToDevice(
		await latestApi.getDeviceLatestPrimaryData(devEui)
	);

	if (targetDevice) {
		applyDashboardLatestReadings(targetDevice, latestDevice);
	}

	app.devices = mergeDashboardDevices(app.devices, [latestDevice]);
	return latestDevice;
}
