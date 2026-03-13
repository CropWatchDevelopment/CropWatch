import { ApiService, ApiServiceError } from '$lib/api/api.service';
import type { DevicePrimaryDataDto, LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	mapDashboardDeviceMetadataToDevice,
	mapDashboardPrimaryDataToDevice,
	mergeDashboardDevices
} from '$lib/components/dashboard/dashboard-device-data';
import type { PageServerLoad } from './$types';

const LATEST_PRIMARY_DATA_PAGE_SIZE = 250;
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

export const load: PageServerLoad = async ({ locals, fetch }) => {
	const authToken = locals.jwtString ?? null;

	if (!authToken) {
		return {
			devices: [] as IDevice[],
			totalDeviceCount: 0,
			triggeredRules: [],
			triggeredRulesCount: 0,
			deviceStatuses: { online: 0, offline: 0 },
			deviceGroups: [] as string[],
			locations: [] as LocationDto[],
			locationGroups: [] as string[],
			dashboardDebug: null as Record<string, unknown> | null
		};
	}

	const apiServiceInstance = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const [
		latestPrimaryDataResult,
		devicesResult,
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
	const locationGroups = locationGroupsResult.value;

	// ── Diagnostic: remove after debugging ──
	const metadataDevices = allDevices.map((device) => mapDashboardDeviceMetadataToDevice(device));
	const primaryDataDevices = latestPrimaryData.map((device) => mapDashboardPrimaryDataToDevice(device));
	console.info('[dashboard-load] metadata devices:', metadataDevices.length, 'sample dev_euis:', metadataDevices.slice(0, 3).map(d => d.dev_eui));
	console.info('[dashboard-load] primary data devices:', primaryDataDevices.length, 'sample dev_euis:', primaryDataDevices.slice(0, 3).map(d => d.dev_eui));
	console.info('[dashboard-load] primary data error:', latestPrimaryDataResult.error, 'source:', latestPrimaryDataResult.source);
	if (primaryDataDevices.length > 0) {
		const sample = primaryDataDevices[0];
		console.info('[dashboard-load] primary sample:', { dev_eui: sample.dev_eui, has_primary_data: sample.has_primary_data, temperature_c: sample.temperature_c, created_at: sample.created_at });
	}

	const devices: IDevice[] = mergeDashboardDevices(metadataDevices, primaryDataDevices);

	const mergedWithPrimaryData = devices.filter(d => d.has_primary_data === true).length;
	console.info('[dashboard-load] merged devices:', devices.length, 'with primary data:', mergedWithPrimaryData);

	const groups: string[] = Array.from(
		new Set(devices.map((device) => device.group).filter((group): group is string => !!group))
	);
	groups.sort((left, right) => left.localeCompare(right));

	const resolvedDeviceGroups =
		deviceGroupsResult.value.length > 0 ? deviceGroupsResult.value : groups;
	const derivedLocations = buildDerivedLocations(latestPrimaryData);
	const resolvedLocations = locations.length > 0 ? locations : derivedLocations;

	return {
		devices,
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
};
