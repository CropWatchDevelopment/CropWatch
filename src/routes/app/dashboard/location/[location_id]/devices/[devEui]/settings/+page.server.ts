import { error, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { LocationService } from '$lib/services/LocationService';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { DeviceOwnersRepository } from '$lib/repositories/DeviceOwnersRepository';

/**
 * Load the device owner’s ID and all locations for the current user.
 * User session, `devEui` and `locationId` are already validated in the layout server load.
 */
export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	try {
		// Get error handler from container
		const errorHandler = new ErrorHandlingService();
		const deviceRepository = new DeviceRepository(supabase, errorHandler);
		const locationRepository = new LocationRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepository, deviceRepository);

		// Don’t `await` the promise, stream the data instead
		const locations = locationService.getAllLocations();

		return {
			locations // streamed
		};
	} catch (err) {
		console.error('Error loading device rules:', err);
		throw error(500, 'Internal Server Error');
	}
};

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

			if (!sessionResult.user.id) {
				return { success: false, error: 'User ID not found in session' };
			}

			if (!devEui) {
				return { success: false, error: 'Device EUI is required' };
			}
			const deviceRepository = new DeviceRepository(locals.supabase, new ErrorHandlingService());
			const deviceService = new DeviceService(deviceRepository);
			const device = await deviceService.getDeviceByEui(devEui);
			const deviceOwnersRepository = new DeviceOwnersRepository(
				locals.supabase,
				new ErrorHandlingService()
			);
			const owners = await deviceOwnersRepository.findByDeviceEui(devEui);

			if (!device) {
				return { success: false, error: 'Device not found' };
			}

			let isOwner = owners.find(
				(owner) => owner.user_id === sessionResult?.user?.id && owner.permission_level === 1
			);
			if (device.user_id !== sessionResult.user.id && !isOwner) {
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
		} catch (err) {
			console.error('Error updating device settings:', err);
			return { success: false, error: 'Internal Server Error' };
		}
	}
};
