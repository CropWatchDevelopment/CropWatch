import { env as publicEnv } from '$env/dynamic/public';
import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type { DevicePrimaryDataDto, LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	buildDeviceTypeLookup,
	mapDashboardDeviceMetadataToDevice,
	mapDashboardPrimaryDataToDevice,
	mergeDashboardDevices
} from '$lib/components/dashboard/dashboard-device-data';
import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';
import type { PageServerLoad } from './$types';

const LATEST_PRIMARY_DATA_PAGE_SIZE = 25;

function resolveDashboardApiBaseUrl(url: URL): string {
	const configuredBaseUrl = publicEnv.PUBLIC_API_BASE_URL?.trim();
	return configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : url.origin;
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
		.sort(
			([leftId, leftName], [rightId, rightName]) =>
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

async function loadDashboardLatestPrimaryData(apiServiceInstance: ApiService): Promise<{
	value: DevicePrimaryDataDto[];
	error: Record<string, unknown> | null;
	source: 'bulk' | 'empty';
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
		return {
			value: [],
			error: serializeError(bulkError),
			source: 'empty',
			skippedDevEuis: []
		};
	}
}

async function loadDashboardPayload(apiServiceInstance: ApiService) {
	const [
		latestPrimaryDataResult,
		devicesResult,
		deviceTypesResult,
		triggeredRules,
		triggeredRulesCount,
		deviceStatusesResult,
		deviceGroupsResult,
		locationsResult,
		locationGroupsResult
	] = await Promise.all([
		loadDashboardLatestPrimaryData(apiServiceInstance),
		apiServiceInstance
			.getAllDevices()
			.then((value) => ({ value: value ?? [], error: null as Record<string, unknown> | null }))
			.catch((error) => ({ value: [], error: serializeError(error) })),
		apiServiceInstance
			.getDeviceTypes()
			.then((value) => ({ value: value ?? [], error: null as Record<string, unknown> | null }))
			.catch((error) => ({ value: [], error: serializeError(error) })),
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
	const allDevices = devicesResult.value;
	const deviceStatuses = deviceStatusesResult.value;
	const locations = locationsResult.value;
	const locationGroups = normalizeDashboardFilterValues(locationGroupsResult.value);

	// ── Build device type lookup from dedicated endpoint ──
	const deviceTypeLookup = buildDeviceTypeLookup(deviceTypesResult.value);
	const metadataDevices = allDevices.map((device) => mapDashboardDeviceMetadataToDevice(device));
	const primaryDataDevices = latestPrimaryData.map((device) => mapDashboardPrimaryDataToDevice(device));

	let devices: IDevice[] = mergeDashboardDevices(metadataDevices, primaryDataDevices);

	// The bulk /devices/latest-primary-data endpoint only covers air and soil sensors.
	// Devices on other tables (e.g. cw_water_data) remain has_primary_data === false after
	// the merge — fetch their latest readings individually so the dashboard shows real data.
	const BULK_PRIMARY_DATA_TABLES = new Set(['cw_air_data', 'cw_soil_data']);
	const devicesNeedingIndividualFetch = devices.filter(
		(device) =>
			device.has_primary_data === false &&
			device.device_type_id != null &&
			(!device.data_table || !BULK_PRIMARY_DATA_TABLES.has(device.data_table))
	);
	if (devicesNeedingIndividualFetch.length > 0) {
		const individualResults = await Promise.allSettled(
			devicesNeedingIndividualFetch.map((device) =>
				apiServiceInstance
					.getDeviceLatestData(device.dev_eui, { suppressNotFoundError: true })
					.then((raw) => mapDashboardPrimaryDataToDevice(raw))
			)
		);
		const resolvedDevices = individualResults
			.filter((r): r is PromiseFulfilledResult<IDevice> => r.status === 'fulfilled')
			.map((r) => r.value);
		if (resolvedDevices.length > 0) {
			devices = mergeDashboardDevices(devices, resolvedDevices);
		}
	}

	const groups = normalizeDashboardFilterValues(devices.map((device) => device.group));
	const deviceGroups = normalizeDashboardFilterValues(deviceGroupsResult.value);

	const resolvedDeviceGroups = deviceGroups.length > 0 ? deviceGroups : groups;
	const derivedLocations = buildDerivedLocations(latestPrimaryData);
	const resolvedLocations = locations.length > 0 ? locations : derivedLocations;

	return {
		devices,
		deviceTypeLookup,
		totalDeviceCount: devices.length,
		triggeredRules,
		triggeredRulesCount,
		deviceStatuses,
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
			devices: {
				count: devices.length,
				error: devicesResult.error
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
}

const EMPTY_DASHBOARD = {
	devices: [] as IDevice[],
	totalDeviceCount: 0,
	triggeredRules: [] as unknown[],
	triggeredRulesCount: 0,
	deviceStatuses: { online: 0, offline: 0 },
	deviceGroups: [] as string[],
	locations: [] as LocationDto[],
	locationGroups: [] as string[],
	dashboardDebug: null as Record<string, unknown> | null
};

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
	const authToken = locals.jwtString ?? null;

	if (!authToken) {
		return {
			authToken: null,
			dashboard: EMPTY_DASHBOARD
		};
	}

	const apiServiceInstance = new ApiService({
		fetchFn: fetch,
		baseUrl: resolveDashboardApiBaseUrl(url),
		authToken
	});

	return {
		authToken,
		dashboard: loadDashboardPayload(apiServiceInstance)
	};
};
