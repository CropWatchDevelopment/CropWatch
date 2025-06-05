import 'reflect-metadata';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { LocationService } from '$lib/services/LocationService';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationRepository } from '$lib/repositories/LocationRepository';

/**
 * Load function to fetch device rules
 */
export const load: PageServerLoad = async ({ params, locals: { safeGetSession, supabase } }) => {
    try {
        const devEui = params.devEui;
        const locationId = params.location_id;
        if (!devEui || !locationId) {
            throw error(400, 'Missing required parameters: devEui or location_id');
        }

        // Create SessionService with per-request Supabase client
        const sessionService = new SessionService(supabase);
        const sessionResult = await sessionService.getSafeSession();

        // If no session exists, redirect to login
        if (!sessionResult?.session && !sessionResult?.user) {
            throw redirect(302, '/auth/login');
        }

        // Get error handler from container
        const errorHandler = new ErrorHandlingService();
        const deviceRepository = new DeviceRepository(supabase, errorHandler);
        const deviceService = new DeviceService(deviceRepository);
        const locationRepository = new LocationRepository(supabase, errorHandler);
        const locationService = new LocationService(locationRepository, deviceRepository);

        const locations = await locationService.getAllLocations();
        const device = await deviceService.getDeviceByEui(devEui);

        return {
            devEui,
            locationId,
            locations,
            device,
        }
    } catch (err) {
        console.error('Error loading device rules:', err);
        throw error(500, 'Internal Server Error');
    }
}