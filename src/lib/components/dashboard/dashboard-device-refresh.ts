import { ApiService } from '$lib/api/api.service';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	applyDashboardLatestReadings,
	mapDashboardPrimaryDataToDevice,
	mergeDashboardDevices
} from './dashboard-device-data';

export const DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES = 10.3;
export const DASHBOARD_DEVICE_OFFLINE_THRESHOLD_MS = 11 * 60_000;

const DASHBOARD_DEVICE_REFRESH_INTERVAL_MS =
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

function getDeviceTimestampMs(device: Pick<IDevice, 'created_at'>): number {
	return device.created_at instanceof Date
		? device.created_at.getTime()
		: new Date(device.created_at).getTime();
}

export function isDashboardDeviceOffline(
	device: Pick<IDevice, 'created_at' | 'has_primary_data'>
): boolean {
	if (device.has_primary_data === false) {
		return true;
	}

	const lastSeenMs = getDeviceTimestampMs(device);
	return (
		!Number.isFinite(lastSeenMs) || lastSeenMs < Date.now() - DASHBOARD_DEVICE_OFFLINE_THRESHOLD_MS
	);
}

export function getDashboardDeviceNextRefreshDelayMs(
	device: Pick<IDevice, 'created_at' | 'has_primary_data'>,
	nowMs = Date.now()
): number | null {
	if (device.has_primary_data === false) {
		return null;
	}

	const lastSeenMs = getDeviceTimestampMs(device);
	if (!Number.isFinite(lastSeenMs)) {
		return null;
	}

	const elapsedMs = Math.max(0, nowMs - lastSeenMs);
	const intervalsElapsed = Math.floor(elapsedMs / DASHBOARD_DEVICE_REFRESH_INTERVAL_MS);
	return DASHBOARD_DEVICE_REFRESH_INTERVAL_MS * (intervalsElapsed + 1) - elapsedMs;
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
