import { ApiService } from '$lib/api/api.service';
import type { GatewayDevicesResponseDto } from '$lib/api/api.dtos';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, fetch }) => {
	const { authToken } = await parent();
	const emptyDevices: GatewayDevicesResponseDto = { devices: [], other_device_count: 0 };
	if (!authToken) {
		return { gateway: null, gatewayDevices: emptyDevices };
	}

	const api = new ApiService({ fetchFn: fetch, authToken });
	const [gateway, gatewayDevices] = await Promise.all([
		api.getGateway(params.gateway_id).catch(() => null),
		api.getGatewayDevices(params.gateway_id).catch(() => emptyDevices)
	]);

	return { gateway, gatewayDevices };
};
