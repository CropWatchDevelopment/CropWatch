import type { GatewayDevicesResponseDto } from '$lib/api/api.dtos';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, parent, locals }) => {
	const { authToken } = await parent();
	const emptyDevices: GatewayDevicesResponseDto = { devices: [], other_device_count: 0 };
	if (!authToken) {
		return { gateway: null, gatewayDevices: emptyDevices };
	}

	const { gateways } = locals.services;
	const [gateway, gatewayDevices] = await Promise.all([
		gateways.getGateway(params.gateway_id).catch(() => null),
		gateways.getGatewayDevices(params.gateway_id).catch(() => emptyDevices)
	]);

	return { gateway, gatewayDevices };
};
