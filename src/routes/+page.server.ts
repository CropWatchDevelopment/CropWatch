import { env as publicEnv } from '$env/dynamic/public';
import { ApiService } from '$lib/api/api.service';
import type { DevicePrimaryDataDto, LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import { mapDashboardPrimaryDataToDevice } from '$lib/components/dashboard/dashboard-device-data';
import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';
import type { PageServerLoad } from './$types';

const LATEST_PRIMARY_DATA_PAGE_SIZE = 25;

function resolveDashboardApiBaseUrl(url: URL): string {
	const configuredBaseUrl = publicEnv.PUBLIC_API_BASE_URL?.trim();
	return configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : url.origin;
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

async function loadDashboardList<T>(
	label: string,
	loadList: () => Promise<T[] | null | undefined>
): Promise<T[]> {
	try {
		return (await loadList()) ?? [];
	} catch (error) {
		console.error(`Failed to load dashboard ${label}`, error);
		return [];
	}
}

async function loadDashboardPayload(apiServiceInstance: ApiService) {
	const [latestPrimaryData, deviceGroups, locations, locationGroups] = await Promise.all([
		await getAllLatestPrimaryDeviceData(apiServiceInstance),
		loadDashboardList('device groups', () => apiServiceInstance.getDeviceGroups()),
		loadDashboardList('locations', () => apiServiceInstance.getLocations()),
		loadDashboardList('location groups', () => apiServiceInstance.getLocationGroups())
	]);

	const devices: IDevice[] = latestPrimaryData.map((device) =>
		mapDashboardPrimaryDataToDevice(device)
	);

	return {
		devices,
		deviceGroups: normalizeDashboardFilterValues(deviceGroups),
		locations,
		locationGroups: normalizeDashboardFilterValues(locationGroups)
	};
}

const EMPTY_DASHBOARD = {
	devices: [] as IDevice[],
	deviceGroups: [] as string[],
	locations: [] as LocationDto[],
	locationGroups: [] as string[]
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
		// Keep all dashboard fetches within the lifetime of this load function.
		dashboard: await loadDashboardPayload(apiServiceInstance)
	};
};
