import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { LocationService } from '$lib/services/LocationService';
import { SessionService } from '$lib/services/SessionService';
import { error, redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

/**
 * Load `location` and `locationId` for all pages under this layout.
 */
export const load = (async ({ params, locals: { supabase } }) => {
	const sessionService = new SessionService(supabase);
	const sessionResult = await sessionService.getSafeSession();

	// If no session exists, redirect to login
	if (!sessionResult || !sessionResult.user) {
		throw redirect(302, '/auth/login');
	}

	const locationId = parseInt(params.location_id, 10);

	if (!locationId) {
		throw error(400, 'Invalid location ID');
	}

	try {
		// Get the error handler from the container
		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const locationRepo = new LocationRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);
		const location = await locationService.getLocationById(locationId);

		return {
			ownerId: sessionResult?.user?.id,
			location,
			locationId
		};
	} catch (err) {
		console.error(`Error loading location ${locationId} details:`, err);
		throw error(500, 'Failed to load location details');
	}
}) satisfies LayoutServerLoad;
