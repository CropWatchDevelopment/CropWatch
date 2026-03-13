import type { DeviceDto, DevicePrimaryDataDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toStringValue(value: unknown): string {
	return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function toNumberValue(value: unknown): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : Number(value ?? 0) || 0;
}

function toDateValue(value: unknown): Date {
	if (value instanceof Date) {
		return value;
	}

	const nextValue = new Date(toStringValue(value));
	return Number.isNaN(nextValue.getTime()) ? new Date(0) : nextValue;
}

function getDashboardEmbeddedLocations(
	device: DeviceDto | Record<string, unknown>
): Record<string, unknown>[] {
	if (Array.isArray(device.cw_locations)) {
		return device.cw_locations.filter(isRecord);
	}

	if (isRecord(device.cw_locations)) {
		return [device.cw_locations];
	}

	return [];
}

function getDashboardDeviceLocationName(device: DeviceDto | Record<string, unknown>): string {
	const directName = toStringValue(device.location_name).trim();
	if (directName) {
		return directName;
	}

	for (const location of getDashboardEmbeddedLocations(device)) {
		const locationName = toStringValue(location?.name).trim();
		if (locationName) {
			return locationName;
		}
	}

	return '';
}

function getDashboardDeviceLocationId(device: DeviceDto | Record<string, unknown>): number {
	const directId = toNumberValue(device.location_id);
	if (directId > 0) {
		return directId;
	}

	for (const location of getDashboardEmbeddedLocations(device)) {
		const locationId = toNumberValue(location.location_id);
		if (locationId > 0) {
			return locationId;
		}
	}

	return directId;
}

function preferIncomingText(
	incoming: string | undefined,
	current: string | undefined
): string | undefined {
	return incoming?.trim() ? incoming : current;
}

function preferIncomingLocationId(incoming: number, current: number): number {
	return incoming > 0 ? incoming : current;
}

export function mapDashboardDeviceMetadataToDevice(
	device: DeviceDto | Record<string, unknown>
): IDevice {
	return {
		dev_eui: toStringValue(device.dev_eui),
		name: toStringValue(device.name ?? device.dev_eui),
		location_name: getDashboardDeviceLocationName(device),
		group: toStringValue(device.group),
		created_at: new Date(0),
		has_primary_data: false,
		co2: 0,
		humidity: 0,
		temperature_c: 0,
		location_id: getDashboardDeviceLocationId(device),
		cwloading: false
	};
}

export function mapDashboardPrimaryDataToDevice(
	device: DevicePrimaryDataDto | Record<string, unknown>
): IDevice {
	return {
		dev_eui: toStringValue(device.dev_eui),
		name: toStringValue(device.name),
		location_name: toStringValue(device.location_name),
		group: toStringValue(device.group),
		created_at: toDateValue(device.created_at),
		has_primary_data: true,
		co2: toNumberValue(device.co2),
		humidity: toNumberValue(device.humidity),
		temperature_c: toNumberValue(device.temperature_c),
		location_id: toNumberValue(device.location_id),
		cwloading: false
	};
}

export function applyDashboardLatestReadings(target: IDevice, source: IDevice): void {
	target.temperature_c = source.temperature_c;
	target.co2 = source.co2;
	target.humidity = source.humidity;
	target.created_at = source.created_at;
	target.has_primary_data = source.has_primary_data;
	target.location_id = preferIncomingLocationId(source.location_id, target.location_id);
	target.location_name = preferIncomingText(source.location_name, target.location_name) ?? '';
	target.group = preferIncomingText(source.group, target.group);
	target.name = preferIncomingText(source.name, target.name) ?? target.dev_eui;
}

export function mergeDashboardDevices(
	currentDevices: IDevice[],
	latestDevices: IDevice[]
): IDevice[] {
	if (latestDevices.length === 0) {
		return currentDevices;
	}

	const latestByDevEui = new Map(latestDevices.map((device) => [device.dev_eui, device] as const));

	const mergedDevices = currentDevices.map((device) => {
		const latestDevice = latestByDevEui.get(device.dev_eui);
		if (!latestDevice) {
			return device;
		}

		latestByDevEui.delete(device.dev_eui);
		return {
			...device,
			...latestDevice,
			name: preferIncomingText(latestDevice.name, device.name) ?? device.dev_eui,
			group: preferIncomingText(latestDevice.group, device.group),
			location_name: preferIncomingText(latestDevice.location_name, device.location_name) ?? '',
			location_id: preferIncomingLocationId(latestDevice.location_id, device.location_id),
			has_primary_data: latestDevice.has_primary_data ?? device.has_primary_data ?? false,
			cwloading: device.cwloading ?? latestDevice.cwloading ?? false
		};
	});

	for (const latestDevice of latestByDevEui.values()) {
		mergedDevices.push({
			...latestDevice,
			has_primary_data: latestDevice.has_primary_data ?? false,
			cwloading: latestDevice.cwloading ?? false
		});
	}

	return mergedDevices;
}
