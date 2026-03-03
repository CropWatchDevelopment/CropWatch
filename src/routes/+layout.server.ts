import apiService, { ApiService } from '$lib/api/api.service';
import type { IDevice } from '$lib/interfaces/device.interface';
import type { LayoutServerLoad } from './$types';

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

	const [latestPrimaryData, triggeredRules, triggeredRulesCount, deviceStatuses, deviceGroups, locations] = await Promise.all([
		apiServiceInstance
			.getLatestPrimaryDeviceData()
			.then((result) => result.data ?? [])
			.catch(() => []),
		apiServiceInstance.getTriggeredRules().catch(() => []),
		apiServiceInstance.getTriggeredRulesCount().catch(() => 0),
		apiServiceInstance.getDeviceStatuses().catch(() => ({ online: 0, offline: 0 })),
		apiServiceInstance.getDeviceGroups().then((result) => result ?? []).catch(() => []),
		apiServiceInstance.getLocations().catch(() => [])
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
		triggeredRules,
		triggeredRulesCount,
		deviceStatuses,
		authToken,
		groups,
		locations,
	};
};
