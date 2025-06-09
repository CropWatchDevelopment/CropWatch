import 'reflect-metadata';
import { error, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { LocationService } from '$lib/services/LocationService';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { DeviceOwnersRepository } from '$lib/repositories/DeviceOwnersRepository';
import { DeviceOwnersService } from '$lib/services/DeviceOwnersService';

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
        
        // Create device owners repository and service
        const deviceOwnersRepository = new DeviceOwnersRepository(supabase, errorHandler);
        const deviceOwnersService = new DeviceOwnersService(deviceOwnersRepository);

        const locations = await locationService.getAllLocations();
        const device = await deviceService.getDeviceByEui(devEui);
        
        // Get device owners with profile information
        const deviceOwners = await deviceOwnersService.getWithProfilesByDeviceEui(devEui);

        return {
            devEui,
            ownerId: sessionResult?.user?.id,
            locationId,
            locations,
            device,
            deviceOwners,
        }
    } catch (err) {
        console.error('Error loading device rules:', err);
        throw error(500, 'Internal Server Error');
    }
}

/**
 * Actions for device permission management
 */
export const actions: Actions = {
    /**
     * Add a user to a device with specified permissions
     */
    addUserToDevice: async ({ request, params, locals }) => {
        try {
            const devEui = params.devEui;
            const data = await request.formData();
            const userId = data.get('userId') as string;
            const permissionLevel = parseInt(data.get('permissionLevel') as string);

            // Create SessionService with per-request Supabase client
            const sessionService = new SessionService(locals.supabase);
            const sessionResult = await sessionService.getSafeSession();

            if (!sessionResult?.session || !sessionResult?.user) {
                return { success: false, error: 'Authentication required' };
            }

            if (!devEui || !userId) {
                return { success: false, error: 'Device EUI and User ID are required' };
            }

            if (isNaN(permissionLevel) || permissionLevel < 1 || permissionLevel > 3) {
                return { success: false, error: 'Permission level must be between 1 (Admin) and 3 (Viewer)' };
            }

            // Initialize services
            const errorHandler = new ErrorHandlingService();
            const deviceRepository = new DeviceRepository(locals.supabase, errorHandler);
            const deviceService = new DeviceService(deviceRepository);
            const deviceOwnersRepository = new DeviceOwnersRepository(locals.supabase, errorHandler);
            const deviceOwnersService = new DeviceOwnersService(deviceOwnersRepository);

            // Verify device exists and user has permission to manage it
            const device = await deviceService.getDeviceByEui(devEui);
            if (!device) {
                return { success: false, error: 'Device not found' };
            }

            // Check if current user has permission to manage this device (admin level or device owner)
            const hasPermission = await deviceOwnersService.hasPermission(devEui, sessionResult.user.id, 1); // Level 1 is admin level
            if (!hasPermission && device.user_id !== sessionResult.user.id) {
                return { success: false, error: 'Unauthorized to manage this device' };
            }

            // Check if user is already added to the device
            const existingOwner = await deviceOwnersService.getByDeviceAndUser(devEui, userId);
            if (existingOwner) {
                return { success: false, error: 'User is already added to this device' };
            }

            // Add user to device
            await deviceOwnersService.addUserToDevice(devEui, userId, permissionLevel);

            return { success: true, message: 'User added to device successfully' };
        } catch (err) {
            console.error('Error adding user to device:', err);
            return { success: false, error: 'Internal Server Error' };
        }
    },

    /**
     * Update user permissions for a device
     */
    updateDevicePermission: async ({ request, params, locals }) => {
        try {
            const devEui = params.devEui;
            const data = await request.formData();
            const deviceOwnerId = parseInt(data.get('deviceOwnerId') as string);
            const permissionLevel = parseInt(data.get('permissionLevel') as string);

            // Create SessionService with per-request Supabase client
            const sessionService = new SessionService(locals.supabase);
            const sessionResult = await sessionService.getSafeSession();

            if (!sessionResult?.session || !sessionResult?.user) {
                return { success: false, error: 'Authentication required' };
            }

            if (!devEui || isNaN(deviceOwnerId)) {
                return { success: false, error: 'Device EUI and Device Owner ID are required' };
            }

            if (isNaN(permissionLevel) || permissionLevel < 1 || permissionLevel > 3) {
                return { success: false, error: 'Permission level must be between 1 (Admin) and 3 (Viewer)' };
            }

            // Initialize services
            const errorHandler = new ErrorHandlingService();
            const deviceRepository = new DeviceRepository(locals.supabase, errorHandler);
            const deviceService = new DeviceService(deviceRepository);
            const deviceOwnersRepository = new DeviceOwnersRepository(locals.supabase, errorHandler);
            const deviceOwnersService = new DeviceOwnersService(deviceOwnersRepository);

            // Verify device exists and user has permission to manage it
            const device = await deviceService.getDeviceByEui(devEui);
            if (!device) {
                return { success: false, error: 'Device not found' };
            }

            // Check if current user has permission to manage this device
            const hasPermission = await deviceOwnersService.hasPermission(devEui, sessionResult.user.id, 1); // Level 1 is admin level
            if (!hasPermission && device.user_id !== sessionResult.user.id) {
                return { success: false, error: 'Unauthorized to manage this device' };
            }

            // Update permission
            const updateResult = await deviceOwnersService.updatePermission(deviceOwnerId, permissionLevel);
            console.log('Update result:', updateResult);

            return { success: true, message: 'Permission updated successfully' };
        } catch (err) {
            console.error('Error updating device permission:', err);
            return { success: false, error: 'Internal Server Error' };
        }
    }
};