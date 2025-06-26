import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { ILocationService } from '$lib/interfaces/ILocationService';
import { PermissionLevel } from '$lib/models/LocationUser';
import type { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { AuthService } from '$lib/services/AuthService';
import { LocationService } from '$lib/services/LocationService';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';

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

	const user = session.user;

	// Create a repository with the authenticated supabase client
	const locationRepo = new LocationRepository(supabase, errorHandler);
	const deviceRepo = new DeviceRepository(supabase, errorHandler);
	// Create a service with the authenticated repository
	const locationService = new LocationService(locationRepo, deviceRepo);

	// Get location details using the service with authenticated client
	const location = await locationService.getLocationById(locationId);
	const devices = await deviceRepo.findByLocation(locationId);

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

	return {
		location,
		locationUsers,
		deviceCount: devices ? devices.length : 0,
		currentUser: user
	};
};

export const actions: Actions = {
	updateLocation: async ({ request, params, locals: { supabase } }) => {
		const locationId = parseInt(params.location_id, 10);

		if (isNaN(locationId)) {
			return { success: false, error: 'Invalid location ID' };
		}

		const formData = await request.formData();
		const name = formData.get('name') as string;
		const latString = formData.get('lat') as string;
		const longString = formData.get('long') as string;

		// Validate name is provided
		if (!name || name.trim() === '') {
			return { success: false, error: 'Location name is required' };
		}

		// Parse latitude and longitude
		let lat: number | null = null;
		let long: number | null = null;

		if (latString && latString.trim() !== '') {
			lat = parseFloat(latString);
			if (isNaN(lat) || lat < -90 || lat > 90) {
				return { success: false, error: 'Invalid latitude value' };
			}
		}

		if (longString && longString.trim() !== '') {
			long = parseFloat(longString);
			if (isNaN(long) || long < -180 || long > 180) {
				return { success: false, error: 'Invalid longitude value' };
			}
		}

		// Only set coordinates if both values are provided
		if ((lat !== null && long === null) || (lat === null && long !== null)) {
			return {
				success: false,
				error: 'Both latitude and longitude must be provided or left empty'
			};
		}

		try {
			const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
			const locationRepo = new LocationRepository(supabase, errorHandler);
			const deviceRepo = new DeviceRepository(supabase, errorHandler);
			const locationService = new LocationService(locationRepo, deviceRepo);

			// Update the location
			const updatedLocation = await locationService.updateLocation(locationId, {
				name,
				lat,
				long
			});

			if (!updatedLocation) {
				return { success: false, error: 'Failed to update location' };
			}

			return { success: true, data: updatedLocation };
		} catch (err) {
			console.error('Error updating location:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'An unexpected error occurred'
			};
		}
	},

	addUser: async ({ request, params, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const permissionLevel = parseInt(formData.get('permissionLevel') as string, 10);
		const applyToDevices = formData.get('applyToDevices') === 'true';
		const locationId = parseInt(params.location_id, 10);

		if (!email || isNaN(permissionLevel) || isNaN(locationId)) {
			return { success: false, error: 'Invalid input data' };
		}

		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const locationRepo = new LocationRepository(supabase, errorHandler);
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);

		const result = await locationService.addUserToLocation(
			locationId,
			email,
			permissionLevel,
			applyToDevices
		);

		return result;
	},

	updatePermission: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session, user } = await safeGetSession();
		if (!session || !user) {
			return { success: false, error: 'Authentication required' };
		}

		const formData = await request.formData();
		const userId = user.id;
		const permissionLevel = parseInt(formData.get('permissionLevel') as string, 10);
		const locationOwnerId = parseInt(formData.get('ownerId') as string, 10);
		const applyToDevices = formData.get('applyToDevices') === 'true';
		const locationId = parseInt(params.location_id, 10);

		if (!userId || isNaN(permissionLevel) || isNaN(locationOwnerId) || isNaN(locationId)) {
			return { success: false, error: 'Invalid input data' };
		}

		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const locationRepo = new LocationRepository(supabase, errorHandler);
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);

		const result = await locationService.updateUserPermission(
			locationId,
			userId,
			locationOwnerId,
			permissionLevel,
			applyToDevices
		);

		return result;
	},

	removeUser: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session, user } = await safeGetSession();
		if (!session || !user) {
			return { success: false, error: 'Authentication required' };
		}
		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const me = user.id;
		const locationOwnerId = parseInt(params.location_id, 10);
		const locationId = parseInt(params.location_id, 10);

		if (!userId || isNaN(locationOwnerId) || isNaN(locationId)) {
			return { success: false, error: 'Invalid input data' };
		}

		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const locationRepo = new LocationRepository(supabase, errorHandler);
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);

		const result = await locationService.removeUserFromLocation(
			locationId,
			userId,
			locationOwnerId,
			me
		);

		return result;
	},

	deleteLocation: async ({ params, locals: { supabase, safeGetSession } }) => {
		const locationId = parseInt(params.location_id, 10);

		if (isNaN(locationId)) {
			return { success: false, error: 'Invalid location ID' };
		}

		const { session, user } = await safeGetSession();
		if (!session || !user) {
			return { success: false, error: 'Authentication required' };
		}

		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const locationRepo = new LocationRepository(supabase, errorHandler);
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);

		try {
			await locationService.deleteLocation(locationId, user.id);
			return { success: true };
		} catch (err) {
			console.error('Error deleting location:', err);
			return {
				success: false,
				error: err instanceof Error ? err.message : 'An unexpected error occurred'
			};
		}
	}
};
