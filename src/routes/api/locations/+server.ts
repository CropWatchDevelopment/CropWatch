import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationService } from '$lib/services/LocationService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Create error handler
		const errorHandler = new ErrorHandlingService();

		// Create repositories with the per-request Supabase client
		const locationRepo = new LocationRepository(locals.supabase, errorHandler);
		const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);

		// Create the location service with the repositories
		const locationService = new LocationService(locationRepo, deviceRepo, errorHandler);

		// Get all basic location data without devices
		const locations = await locationService.getAllLocations();

		// Add a deviceCount property to each location
		const enhancedLocations = await Promise.all(
			locations.map(async (location) => {
				try {
					// Instead of fetching all device data, just get the count
					const deviceCount = await locationService.getDeviceCountForLocation(location.location_id);

					return {
						...location,
						deviceCount
					};
				} catch (error) {
					console.error(`Error getting device count for location ${location.location_id}:`, error);
					return {
						...location,
						deviceCount: 0,
						error: 'Failed to get device count'
					};
				}
			})
		);

		return json(enhancedLocations);
	} catch (error) {
		console.error('Error fetching locations:', error);
		return json({ error: 'Failed to fetch location data' }, { status: 500 });
	}
};
