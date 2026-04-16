import type { DeviceDto, DevicePrimaryDataDto, DeviceTypeDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
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
	if (device.location_name) return device.location_name as string;

	for (const location of getDashboardEmbeddedLocations(device)) {
		if (location?.name) return location.name as string;
	}

	return '';
}

function getDashboardDeviceLocationId(device: DeviceDto | Record<string, unknown>): number {
	const directId = Number(device.location_id);
	if (directId > 0) return directId;

	for (const location of getDashboardEmbeddedLocations(device)) {
		const id = Number(location.location_id);
		if (id > 0) return id;
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

function getDeviceDataTable(
	device: DeviceDto | DevicePrimaryDataDto | Record<string, unknown>
): string {
	const directDataTable = device.data_table_v2 ?? device.data_table;
	if (directDataTable) return directDataTable as string;

	if (isRecord(device.cw_device_type)) {
		return (device.cw_device_type.data_table_v2 ?? device.cw_device_type.data_table ?? '') as string;
	}

	return '';
}

function extractDeviceTypeId(
	device: DeviceDto | DevicePrimaryDataDto | Record<string, unknown>
): number | undefined {
	const raw = (device as Record<string, unknown>).type;
	if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) return raw;
	return undefined;
}

/** Configuration for a device type, keyed by cw_device_type.model. */
export interface DeviceTypeConfig {
	primary_data_key?: string;
	secondary_data_key?: string;
	primary_data_notation?: string;
	secondary_data_notation?: string;
}

/** Lookup maps built from the `/devices/device-types` endpoint. */
export interface DeviceTypeLookup {
	/** model string → full config */
	byModel: Record<string, DeviceTypeConfig>;
	/** cw_device_type.id → model string (bridges CwDevice.type FK) */
	idToModel: Record<number, string>;
}

/**
 * Build lookup maps from the full device-type list (`getDeviceTypes()`).
 * Keyed by `cw_device_type.model` with an id→model bridge so individual
 * devices can resolve their type via their numeric FK (`device.type`).
 */
export function buildDeviceTypeLookup(deviceTypes: DeviceTypeDto[]): DeviceTypeLookup {
	const byModel: Record<string, DeviceTypeConfig> = {};
	const idToModel: Record<number, string> = {};

	for (const dt of deviceTypes) {
		const model = dt.model || undefined;
		if (!model) continue;

		const id = typeof dt.id === 'number' && Number.isFinite(dt.id) ? dt.id : undefined;
		if (id != null) idToModel[id] = model;

		if (byModel[model]) continue;

		byModel[model] = {
			primary_data_key: dt.primary_data_v2 ?? undefined,
			secondary_data_key: dt.secondary_data_v2 ?? undefined,
			primary_data_notation: dt.primary_data_notation ?? undefined,
			secondary_data_notation: dt.secondary_data_notation ?? undefined,
		};
	}

	return { byModel, idToModel };
}

/** Resolve a DeviceTypeConfig for an IDevice using its type FK. */
export function resolveDeviceTypeConfig(
	device: IDevice,
	lookup: DeviceTypeLookup | undefined
): DeviceTypeConfig | undefined {
	if (!lookup || !device.device_type_id) return undefined;
	const model = lookup.idToModel[device.device_type_id];
	return model ? lookup.byModel[model] : undefined;
}

export function mapDashboardDeviceMetadataToDevice(
	device: DeviceDto | Record<string, unknown>
): IDevice {
	return {
		dev_eui: device.dev_eui as string,
		name: (device.name ?? device.dev_eui) as string,
		location_name: getDashboardDeviceLocationName(device),
		group: device.group as string,
		data_table: getDeviceDataTable(device) || undefined,
		created_at: new Date(0),
		has_primary_data: false,
		co2: 0,
		humidity: 0,
		temperature_c: 0,
		soil_humidity: null,
		location_id: getDashboardDeviceLocationId(device),
		cwloading: false,
		device_type_id: extractDeviceTypeId(device)
	};
}

export function mapDashboardPrimaryDataToDevice(
	device: DevicePrimaryDataDto | Record<string, unknown>
): IDevice {
	const dataTable = getDeviceDataTable(device);
	const moisture = device.moisture;
	const soilHumidity = moisture != null ? Number(moisture) : null;

	// Preserve the full raw payload so dynamic column keys can be resolved
	const raw_data: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(device)) {
		if (key !== 'cw_device_type' && key !== 'cw_locations' && key !== 'cw_device_owners') {
			raw_data[key] = value;
		}
	}

	const createdAt = device.created_at;
	const parsedDate = createdAt instanceof Date ? createdAt : new Date(createdAt as string);

	return {
		dev_eui: device.dev_eui as string,
		name: device.name as string,
		location_name: device.location_name as string,
		group: device.group as string,
		...(dataTable ? { data_table: dataTable } : {}),
		created_at: parsedDate,
		has_primary_data: true,
		co2: Number(device.co2) || 0,
		humidity: Number(device.humidity) || 0,
		temperature_c: Number(device.temperature_c) || 0,
		soil_humidity: soilHumidity,
		location_id: Number(device.location_id) || 0,
		cwloading: false,
		raw_data,
		device_type_id: extractDeviceTypeId(device)
	};
}

export function applyDashboardLatestReadings(target: IDevice, source: IDevice): void {
	const resolvedDataTable = preferIncomingText(source.data_table, target.data_table);
	const isSoilDevice = resolvedDataTable === 'cw_soil_data';

	target.temperature_c = source.temperature_c;
	target.co2 = source.co2;
	target.humidity = source.humidity;
	target.soil_humidity =
		source.soil_humidity ?? (isSoilDevice ? (target.soil_humidity ?? null) : null);
	target.created_at = source.created_at;
	target.has_primary_data = source.has_primary_data;
	target.location_id = preferIncomingLocationId(source.location_id, target.location_id);
	target.location_name = preferIncomingText(source.location_name, target.location_name) ?? '';
	target.group = preferIncomingText(source.group, target.group);
	target.alert_count = source.alert_count ?? target.alert_count ?? 0;
	target.data_table = resolvedDataTable;
	target.name = preferIncomingText(source.name, target.name) ?? target.dev_eui;

	// Preserve device_type_id (metadata device has it, primary data refresh may not)
	target.device_type_id = source.device_type_id ?? target.device_type_id;

	// Merge raw sensor data
	if (source.raw_data) {
		target.raw_data = { ...target.raw_data, ...source.raw_data };
	}
}

export function mergeDashboardDevices(
	currentDevices: IDevice[],
	latestDevices: IDevice[]
): IDevice[] {
	if (latestDevices.length === 0) return currentDevices;

	const latestByDevEui = new Map(latestDevices.map((device) => [device.dev_eui, device] as const));

	const mergedDevices = currentDevices.map((device) => {
		const latestDevice = latestByDevEui.get(device.dev_eui);
		if (!latestDevice) return device;

		latestByDevEui.delete(device.dev_eui);
		const resolvedDataTable = preferIncomingText(latestDevice.data_table, device.data_table);
		const isSoilDevice = resolvedDataTable === 'cw_soil_data';

		return {
			...device,
			...latestDevice,
			name: preferIncomingText(latestDevice.name, device.name) ?? device.dev_eui,
			group: preferIncomingText(latestDevice.group, device.group),
			data_table: resolvedDataTable,
			location_name: preferIncomingText(latestDevice.location_name, device.location_name) ?? '',
			location_id: preferIncomingLocationId(latestDevice.location_id, device.location_id),
			has_primary_data: latestDevice.has_primary_data ?? device.has_primary_data ?? false,
			soil_humidity:
				latestDevice.soil_humidity ?? (isSoilDevice ? (device.soil_humidity ?? null) : null),
			cwloading: device.cwloading ?? latestDevice.cwloading ?? false,
			alert_count: latestDevice.alert_count ?? device.alert_count ?? 0,
			// Preserve device_type_id (metadata device has it, primary data refresh may not)
			device_type_id: device.device_type_id ?? latestDevice.device_type_id,
			raw_data: latestDevice.raw_data
				? { ...device.raw_data, ...latestDevice.raw_data }
				: device.raw_data
		};
	});

	for (const latestDevice of latestByDevEui.values()) {
		mergedDevices.push({
			...latestDevice,
			has_primary_data: latestDevice.has_primary_data ?? false,
			cwloading: latestDevice.cwloading ?? false,
			alert_count: latestDevice.alert_count ?? 0
		});
	}

	return mergedDevices;
}
