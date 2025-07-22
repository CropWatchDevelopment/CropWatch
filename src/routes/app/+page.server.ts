import { redirect, fail } from '@sveltejs/kit';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import type { PageServerLoad } from '../../$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const sessionService = new SessionService(supabase);
	const { session, user } = await sessionService.getSafeSession();
	if (!session || !user) {
		throw redirect(302, '/auth/login');
	}

	const errorHandler = new ErrorHandlingService();
	const deviceRepository = new DeviceRepository(supabase, errorHandler);
	const deviceDataService = new DeviceDataService(supabase, errorHandler);
	const deviceService = new DeviceService(deviceRepository, deviceDataService);
	// const allDevicesPromise = deviceService.getAllDevices()
	const allDevicesWithTypes = deviceService.getAllDevicesWithTypes();

	return { allDevicesWithTypes };
};
