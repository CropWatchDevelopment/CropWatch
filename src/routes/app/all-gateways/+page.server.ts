import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { GatewayRepository } from '$lib/repositories/GatewayRepository';
import { GatewayService } from '$lib/services/GatewayService';
import { DeviceGatewayRepository } from '$lib/repositories/DeviceGatewayRepository';
import { DeviceGatewayService } from '$lib/services/DeviceGatewayService';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const sessionService = new SessionService(supabase);
	const { session, user } = await sessionService.getSafeSession();

	if (!session || !user) {
		throw redirect(302, '/auth/login');
	}

	try {
		const errorHandler = new ErrorHandlingService();
		const gatewayRepository = new GatewayRepository(supabase, errorHandler);
		const gatewayService = new GatewayService(gatewayRepository);
		const deviceGatewayRepository = new DeviceGatewayRepository(supabase, errorHandler);
		const deviceGatewayService = new DeviceGatewayService(deviceGatewayRepository);

		const gateways = await gatewayService.getGatewaysByUser(user.id);
		const gatewayIds = gateways.map((gateway) => gateway.gateway_id).filter(Boolean) as string[];
		const gatewayDeviceMap = gatewayIds.length
			? await deviceGatewayService.getDevicesForGatewayIds(gatewayIds)
			: {};

		return { gateways, gatewayDeviceMap };
	} catch (err) {
		console.error('Failed to load gateways', err);
		throw fail(500, { message: 'Unable to load gateways' });
	}
};
