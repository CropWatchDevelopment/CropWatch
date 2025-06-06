import 'reflect-metadata';
import { error, redirect, type Actions } from '@sveltejs/kit';
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
            ownerId: sessionResult?.user?.id,
            locationId,
            locations,
            device,
        }
    } catch (err) {
        console.error('Error loading device rules:', err);
        throw error(500, 'Internal Server Error');
    }
}

/**
 * Actions for device rule management
 */
export const actions: Actions = {
    /**
     * Create a new rule with criteria
     */
    updateGeneralSettings: async ({ request, params, locals }) => {
        try {
            const devEui = params.devEui;
            const data = await request.formData();

            // Create SessionService with per-request Supabase client
            const sessionService = new SessionService(locals.supabase);
            const sessionResult = await sessionService.getSafeSession();

            if (!sessionResult?.session || !sessionResult?.user) {
                return { success: false, error: 'Authentication required' };
            }

            if (!devEui) {
                return { success: false, error: 'Device EUI is required' };
            }
            const deviceRepository = new DeviceRepository(locals.supabase, new ErrorHandlingService());
            const deviceService = new DeviceService(deviceRepository);
            const device = await deviceService.getDeviceByEui(devEui);
            if (!device) {
                return { success: false, error: 'Device not found' };
            }
            if (device.user_id !== sessionResult.user.id) {
                return { success: false, error: 'Unauthorized to update this device' };
            }

            const deviceToUpdate = { ...device };
            deviceToUpdate.name = data.get('name')?.toString() || device.name;

            const newLocation = data.get('location_id');
            if (newLocation) {
                deviceToUpdate.location_id = +newLocation;
            }

            const response = await deviceService.updateDevice(devEui, deviceToUpdate);
            if (!response) {
                return { success: false, error: 'Failed to update device settings' };
            }
            return { success: true, message: 'Device settings updated successfully' };
        }
        catch (err) {
            console.error('Error updating device settings:', err);
            return { success: false, error: 'Internal Server Error' };
        }
    }
}