import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type { DeviceDto, DevicePrimaryDataDto, LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import type { LayoutServerLoad } from './$types';

const LATEST_PRIMARY_DATA_PAGE_SIZE = 250;
const FALLBACK_DEVICE_BATCH_SIZE = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (typeof value === 'string') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
}

function readLocationNameFromDevice(device: DeviceDto | null | undefined): string {
	if (!device) {
		return '';
	}

	const directLocationName = readString(device.location_name);
	if (directLocationName) {
		return directLocationName;
	}

	const locationRecord = device.cw_locations;
	if (isRecord(locationRecord)) {
		const nestedLocationName = readString(locationRecord.name);
		if (nestedLocationName) {
			return nestedLocationName;
		}
	}

	if (Array.isArray(locationRecord)) {
		for (const entry of locationRecord) {
			if (!isRecord(entry)) {
				continue;
			}

			const nestedLocationName = readString(entry.name);
			if (nestedLocationName) {
				return nestedLocationName;
			}
		}
	}

	return '';
}

function enrichLatestPrimaryData(
	latest: DevicePrimaryDataDto,
	device: DeviceDto | null | undefined
): DevicePrimaryDataDto {
	const deviceName = readString(device?.name);
	const locationId = readNumber(device?.location_id);
	const locationName = readLocationNameFromDevice(device);
	const group = readString(device?.group);

	return {
		...latest,
		name: readString(latest.name) || deviceName || latest.dev_eui,
		location_id: readNumber(latest.location_id) ?? locationId ?? undefined,
		location_name: readString(latest.location_name) || locationName || undefined,
		group: readString(latest.group) || group || undefined
	};
}

function serializeError(error: unknown): Record<string, unknown> {
	if (error instanceof ApiServiceError) {
		return {
			name: error.name,
			message: error.message,
			status: error.status,
			payload: error.payload
		};
	}

	if (error instanceof Error) {
		return {
			name: error.name,
			message: error.message
		};
	}

	return {
		message: String(error)
	};
}

async function getAllLatestPrimaryDeviceData(
	apiServiceInstance: ApiService
): Promise<DevicePrimaryDataDto[]> {
	const firstPage = await apiServiceInstance.getLatestPrimaryDeviceData({
		skip: 0,
		take: LATEST_PRIMARY_DATA_PAGE_SIZE
	});

	const firstBatch = firstPage.data ?? [];
	const total =
		typeof firstPage.total === 'number' && Number.isFinite(firstPage.total)
			? Math.max(0, firstPage.total)
			: firstBatch.length;

	const allDevices = [...firstBatch];
	let skip = LATEST_PRIMARY_DATA_PAGE_SIZE;

	while (skip < total) {
		const nextPage = await apiServiceInstance.getLatestPrimaryDeviceData({
			skip,
			take: LATEST_PRIMARY_DATA_PAGE_SIZE
		});
		const nextBatch = nextPage.data ?? [];

		if (nextBatch.length === 0) {
			break;
		}

		allDevices.push(...nextBatch);
		skip += LATEST_PRIMARY_DATA_PAGE_SIZE;
	}

	return allDevices;
}

function buildDerivedLocations(latestPrimaryData: DevicePrimaryDataDto[]): LocationDto[] {
	const locationMap = new Map<number, string>();

	for (const device of latestPrimaryData) {
		const locationId = Number(device.location_id);
		const locationName =
			typeof device.location_name === 'string' ? device.location_name.trim() : '';

		if (!Number.isFinite(locationId) || locationId <= 0 || !locationName) {
			continue;
		}

		if (!locationMap.has(locationId)) {
			locationMap.set(locationId, locationName);
		}
	}

	return Array.from(locationMap.entries())
		.sort(([leftId, leftName], [rightId, rightName]) =>
			leftName.localeCompare(rightName) || leftId - rightId
		)
		.map(
			([location_id, name]) =>
				({
					location_id,
					name,
					created_at: new Date(0).toISOString()
				}) as LocationDto
		);
}

async function getLatestPrimaryDataPerDeviceFallback(apiServiceInstance: ApiService): Promise<{
	value: DevicePrimaryDataDto[];
	skippedDevEuis: string[];
}> {
	const devices = await apiServiceInstance.getDevices();
	const deviceByDevEui = new Map(
		devices.map((device) => [readString(device.dev_eui), device] as const).filter(([devEui]) => !!devEui)
	);
	const devEuis = devices
		.map((device: DeviceDto) => (typeof device.dev_eui === 'string' ? device.dev_eui.trim() : ''))
		.filter((devEui) => devEui.length > 0);

	const latestPrimaryData: DevicePrimaryDataDto[] = [];
	const skippedDevEuis: string[] = [];

	for (let index = 0; index < devEuis.length; index += FALLBACK_DEVICE_BATCH_SIZE) {
		const batch = devEuis.slice(index, index + FALLBACK_DEVICE_BATCH_SIZE);
		const batchResults = await Promise.all(
			batch.map(async (devEui) => {
				try {
					const [latestPrimaryData, deviceMetadata] = await Promise.all([
						apiServiceInstance.getDeviceLatestPrimaryData(devEui),
						apiServiceInstance
							.getDevice(devEui)
							.catch(() => deviceByDevEui.get(devEui) ?? null)
					]);

					return enrichLatestPrimaryData(latestPrimaryData, deviceMetadata);
				} catch (error) {
					console.error(`Failed to load latest primary data for device ${devEui}`, error);
					skippedDevEuis.push(devEui);
					return null;
				}
			})
		);

		for (const result of batchResults) {
			if (result) {
				latestPrimaryData.push(result);
			}
		}
	}

	return {
		value: latestPrimaryData,
		skippedDevEuis
	};
}

async function loadDashboardLatestPrimaryData(apiServiceInstance: ApiService): Promise<{
	value: DevicePrimaryDataDto[];
	error: Record<string, unknown> | null;
	source: 'bulk' | 'per-device' | 'empty';
	skippedDevEuis: string[];
}> {
	try {
		return {
			value: await getAllLatestPrimaryDeviceData(apiServiceInstance),
			error: null,
			source: 'bulk',
			skippedDevEuis: []
		};
	} catch (bulkError) {
		console.error('Failed to load latest primary data', bulkError);

		try {
			const fallback = await getLatestPrimaryDataPerDeviceFallback(apiServiceInstance);
			return {
				value: fallback.value,
				error: serializeError(bulkError),
				source: 'per-device',
				skippedDevEuis: fallback.skippedDevEuis
			};
		} catch (fallbackError) {
			return {
				value: [],
				error: {
					bulk: serializeError(bulkError),
					fallback: serializeError(fallbackError)
				},
				source: 'empty',
				skippedDevEuis: []
			};
		}
	}
}

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	const session = locals.jwt ?? null;
	const authToken = locals.jwtString ?? null;

	if (!authToken) {
		return {
			session,
			devices: [],
			totalDeviceCount: 0,
			triggeredRulesCount: 0
		};
	}

	const apiServiceInstance = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const [
		latestPrimaryDataResult,
		triggeredRules,
		triggeredRulesCount,
		deviceStatusesResult,
		deviceGroupsResult,
		locationsResult,
		locationGroupsResult
	] = await Promise.all([
		loadDashboardLatestPrimaryData(apiServiceInstance),
		apiServiceInstance.getTriggeredRules().catch(() => []),
		apiServiceInstance.getTriggeredRulesCount().catch(() => 0),
		apiServiceInstance
			.getDeviceStatuses()
			.then((value) => ({ value, error: null as Record<string, unknown> | null }))
			.catch((error) => ({
				value: { online: 0, offline: 0 },
				error: serializeError(error)
			})),
		apiServiceInstance
			.getDeviceGroups()
			.then((value) => ({ value: value ?? [], error: null as Record<string, unknown> | null }))
			.catch((error) => ({ value: [], error: serializeError(error) })),
		apiServiceInstance
			.getLocations()
			.then((value) => ({ value, error: null as Record<string, unknown> | null }))
			.catch((error) => ({ value: [], error: serializeError(error) })),
		apiServiceInstance
			.getLocationGroups()
			.then((value) => ({ value, error: null as Record<string, unknown> | null }))
			.catch((error) => ({ value: [], error: serializeError(error) }))
	]);

	const latestPrimaryData = latestPrimaryDataResult.value;
	const deviceStatuses = deviceStatusesResult.value;
	const locations = locationsResult.value;
	const locationGroups = locationGroupsResult.value;

	const devices: IDevice[] = latestPrimaryData.map((device) => ({
		dev_eui: device.dev_eui,
		name: String(device.name ?? device.dev_eui),
		location_name: String(device.location_name ?? ''),
		group: String(device.group ?? ''),
		created_at: new Date(device.created_at),
		co2: Number(device.co2 ?? 0),
		humidity: Number(device.humidity ?? 0),
		temperature_c: Number(device.temperature_c ?? 0),
		location_id: Number(device.location_id ?? 0),
		cwloading: false
	}));

	// get all unique groups from devices array
	const groups: string[] = Array.from(new Set(devices.map((d) => d.group).filter((g): g is string => !!g)));
	// sort groups alphabetically
	groups.sort((a, b) => a.localeCompare(b));
	const resolvedDeviceGroups = deviceGroupsResult.value.length > 0 ? deviceGroupsResult.value : groups;
	const derivedLocations = buildDerivedLocations(latestPrimaryData);
	const resolvedLocations = locations.length > 0 ? locations : derivedLocations;

	return {
		session,
		devices,
		totalDeviceCount: devices.length,
		triggeredRules,
		triggeredRulesCount,
		deviceStatuses,
		authToken,
		deviceGroups: resolvedDeviceGroups,
		locations: resolvedLocations,
		locationGroups,
		dashboardDebug: {
			latestPrimaryData: {
				count: latestPrimaryData.length,
				error: latestPrimaryDataResult.error,
				source: latestPrimaryDataResult.source,
				skippedDevEuis: latestPrimaryDataResult.skippedDevEuis
			},
			deviceStatuses: {
				value: deviceStatuses,
				error: deviceStatusesResult.error
			},
			deviceGroups: {
				count: resolvedDeviceGroups.length,
				error: deviceGroupsResult.error
			},
			locations: {
				count: resolvedLocations.length,
				error: locationsResult.error
			},
			locationGroups: {
				count: locationGroups.length,
				error: locationGroupsResult.error
			}
		}
	};
};
