import { redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationService } from '$lib/services/LocationService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { AuthService } from '$lib/services/AuthService';
import type { LocationInsert } from '$lib/models/Location';

export const load: PageServerLoad = async ({ locals }) => {
    // Create a new SessionService instance with the per-request Supabase client
    const sessionService = new SessionService(locals.supabase);
    const sessionResult = await sessionService.getSafeSession();

    // If no session exists, redirect to login
    if (!sessionResult || !sessionResult.user) {
        throw redirect(302, '/auth/login');
    }
    return {};
};


export const actions: Actions = {
    createLocation: async ({ request, params, locals: { supabase } }) => {
        const errorHandler = new ErrorHandlingService();
        const authService = new AuthService(supabase, errorHandler);
        const session = await authService.getSession();

        if (!session || !session.user) {
            throw redirect(302, '/auth/login');
        }

        const user = session.user;
        const formData = await request.formData();
        const name = formData.get('name') as string;
        const description = formData.get('description') as string;
        const latString = formData.get('lat') as string;
        const longString = formData.get('long') as string;

        try {
            const locationRepo = new LocationRepository(supabase, errorHandler);
            const deviceRepo = new DeviceRepository(supabase, errorHandler);
            const locationService = new LocationService(locationRepo, deviceRepo);

            const location: LocationInsert = {
                name,
                description,
                lat: parseFloat(latString),
                long: parseFloat(longString),
                owner_id: user.id
            };
            // Update the location
            const updatedLocation = await locationService.createLocation(location);

            if (!updatedLocation) {
                return { success: false, error: 'Failed to create location' };
            }

            return { success: true, data: updatedLocation };
        } catch (err) {
            console.error('Error creating location:', err);
            return {
                success: false,
                error: err instanceof Error ? err.message : 'An unexpected error occurred'
            };
        }
    },
};