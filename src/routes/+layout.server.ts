import { ApiService } from '$lib/api/api.service';
import type { DevicePrimaryDataDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import type { LayoutServerLoad } from './$types';

const LATEST_PRIMARY_DATA_PAGE_SIZE = 250;

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
	let skip = firstBatch.length;

	while (allDevices.length < total) {
		const nextPage = await apiServiceInstance.getLatestPrimaryDeviceData({
			skip,
			take: LATEST_PRIMARY_DATA_PAGE_SIZE
		});
		const nextBatch = nextPage.data ?? [];

		if (nextBatch.length === 0) {
			break;
		}

		allDevices.push(...nextBatch);
		skip += nextBatch.length;
	}

	return allDevices;
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

	const [latestPrimaryData, triggeredRules, triggeredRulesCount, deviceStatuses, deviceGroups, locations, locationGroups] = await Promise.all([
		getAllLatestPrimaryDeviceData(apiServiceInstance).catch(() => []),
		apiServiceInstance.getTriggeredRules().catch(() => []),
		apiServiceInstance.getTriggeredRulesCount().catch(() => 0),
		apiServiceInstance.getDeviceStatuses().catch(() => ({ online: 0, offline: 0 })),
		apiServiceInstance.getDeviceGroups().then((result) => result ?? []).catch(() => []),
		apiServiceInstance.getLocations().catch(() => []),
		apiServiceInstance.getLocationGroups().catch(() => [])
	]);

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

	return {
		session,
		devices,
		totalDeviceCount: devices.length,
		triggeredRules,
		triggeredRulesCount,
		deviceStatuses,
		authToken,
		deviceGroups,
		locations,
		locationGroups
	};
};
