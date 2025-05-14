import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { ILocationService } from '$lib/interfaces/ILocationService';
import { PermissionLevel } from '$lib/models/LocationUser';
import type { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { AuthService } from '$lib/services/AuthService';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
    const locationId = parseInt(params.location_id, 10);

    if (isNaN(locationId)) {
        throw error(400, 'Invalid location ID');
    }

    const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
    const authService = new AuthService(supabase, errorHandler);
    const session = await authService.getSession();
    
    if (!session || !session.user) {
        throw redirect(302, '/auth/login');
    }

    const locationService = container.get<ILocationService>(TYPES.LocationService);

    // Get location details
    const location = await locationService.getLocationById(locationId);

    if (!location) {
        throw error(404, 'Location not found');
    }

    // Check if current user has admin permission for this location
    const hasAdminPermission = await locationService.checkUserLocationPermission(
        locationId,
        user.id,
        PermissionLevel.Admin
    );

    if (!hasAdminPermission) {
        throw error(403, 'Only administrators can access location settings');
    }

    // Get all users with access to this location
    const locationUsers = await locationService.getLocationUsers(locationId);

    // Get all devices in this location
    const devices = await locationService.getDeviceCountForLocation(locationId);

    return {
        location,
        locationUsers,
        deviceCount: devices,
        currentUser: user
    };
};

export const actions: Actions = {
    addUser: async ({ request, params }) => {
        const formData = await request.formData();
        const email = formData.get('email') as string;
        const permissionLevel = parseInt(formData.get('permissionLevel') as string, 10);
        const applyToDevices = formData.get('applyToDevices') === 'true';
        const locationId = parseInt(params.location_id, 10);

        if (!email || isNaN(permissionLevel) || isNaN(locationId)) {
            return { success: false, error: 'Invalid input data' };
        }

        const locationService = container.get<ILocationService>(TYPES.LocationService);

        const result = await locationService.addUserToLocation(
            locationId,
            email,
            permissionLevel,
            applyToDevices
        );

        return result;
    },

    updatePermission: async ({ request, params }) => {
        const formData = await request.formData();
        const userId = formData.get('userId') as string;
        const permissionLevel = parseInt(formData.get('permissionLevel') as string, 10);
        const locationOwnerId = parseInt(formData.get('locationOwnerId') as string, 10);
        const applyToDevices = formData.get('applyToDevices') === 'true';
        const locationId = parseInt(params.location_id, 10);

        if (!userId || isNaN(permissionLevel) || isNaN(locationOwnerId) || isNaN(locationId)) {
            return { success: false, error: 'Invalid input data' };
        }

        const locationService = container.get<ILocationService>(TYPES.LocationService);

        const result = await locationService.updateUserPermission(
            locationId,
            userId,
            locationOwnerId,
            permissionLevel,
            applyToDevices
        );

        return result;
    },

    removeUser: async ({ request, params }) => {
        const formData = await request.formData();
        const userId = formData.get('userId') as string;
        const locationOwnerId = parseInt(formData.get('locationOwnerId') as string, 10);
        const locationId = parseInt(params.location_id, 10);

        if (!userId || isNaN(locationOwnerId) || isNaN(locationId)) {
            return { success: false, error: 'Invalid input data' };
        }

        const locationService = container.get<ILocationService>(TYPES.LocationService);

        const result = await locationService.removeUserFromLocation(
            locationId,
            userId,
            locationOwnerId
        );

        return result;
    }
};