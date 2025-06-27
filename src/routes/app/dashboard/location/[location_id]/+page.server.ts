import { error } from '@sveltejs/kit';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { PageServerLoad } from './$types';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';

/**
 * Load `devices` for a specific location.
 * User session and `locationId` are already validated in the layout server load.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const locationId = parseInt(params.location_id, 10);

	try {
		// Get the error handler from the container
		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);

		// Fetch devices for this location
		// Don’t `await` the promise, stream the data instead
		const devices = deviceService.getDevicesByLocation(locationId);

		return {
			devices // streamed
		};
	} catch (err) {
		console.error(`Error loading location ${locationId} details:`, err);
		throw error(500, 'Failed to load location details');
	}
};
