import { redirect } from '@sveltejs/kit';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { DashboardService } from '$lib/services/DashboardService';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase }, url }) => {
	const sessionService = new SessionService(supabase);
	const { session, user } = await sessionService.getSafeSession();
	if (!session || !user) {
		throw redirect(302, '/auth/login');
	}

	// Get pagination parameters from URL search params
	const gatewayPage = parseInt(url.searchParams.get('gatewayPage') || '1');
	const gatewayLimit = parseInt(url.searchParams.get('gatewayLimit') || '5');

	const errorHandler = new ErrorHandlingService();
	const deviceRepository = new DeviceRepository(supabase, errorHandler);
	const deviceDataService = new DeviceDataService(supabase, errorHandler);
	const deviceService = new DeviceService(deviceRepository, deviceDataService);
	const dashboardService = new DashboardService(supabase, errorHandler);

	// Get the device list, dashboard metrics, and paginated gateways
	const [allDevicesWithTypes, dashboardMetrics, paginatedGateways] = await Promise.all([
		deviceService.getAllDevicesWithTypes(),
		dashboardService.getDashboardMetrics(),
		dashboardService.getPaginatedGateways(gatewayPage, gatewayLimit, user.id)
	]);

	return {
		allDevicesWithTypes,
		dashboardMetrics,
		paginatedGateways
	};
};
