import { error, redirect } from '@sveltejs/kit';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { LocationService } from '$lib/services/LocationService';

export const load: PageServerLoad = async ({ params, locals }) => {
    const { location_id } = params;
    const sessionService = new SessionService(locals.supabase);
    const sessionResult = await sessionService.getSafeSession();

    // If no session exists, redirect to login
    if (!sessionResult || !sessionResult.user) {
        throw redirect(302, '/auth/login');
    }

    const locationId = parseInt(location_id);
    if (!locationId) {
        throw error(400, 'Invalid location ID');
    }

    try {
        // Get the error handler from the container
        const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
        const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
        const locationRepo = new LocationRepository(locals.supabase, errorHandler);
        const locationService = new LocationService(locationRepo, deviceRepo);
        const deviceService = new DeviceService(deviceRepo);

        const devices = await deviceService.getDevicesByLocation(locationId);

        return {
            devices,
            locationId,
        };
    } catch (err) {
        console.error(`Error loading device details for ${devEui}:`, err);
        throw error(500, 'Failed to load device details');
    }
};