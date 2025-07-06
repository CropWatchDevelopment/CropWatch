import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { error, json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({
	params,
	url,
	locals: { safeGetSession, supabase }
}) => {
	const { devEui } = params;
	const { session, user } = await safeGetSession();
	if (!session) {
		console.error('Session is null on device data API for device:', devEui);
	}
	if (!devEui) {
		console.error('Device EUI is missing in the request');
		throw error(400, 'Bad Request - Device EUI is required');
	}

	try {
		// Create services directly
		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);

		const device = await deviceService.getDeviceWithTypeByEui(devEui);

		if (!device) {
			throw error(404, 'Device not found');
		}

		// Return a proper Response object using json helper
		return json(device);
	} catch (err) {
		console.error('Error fetching device data:', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Otherwise throw a generic 500 error
		throw error(500, 'Internal Server Error');
	}
};

export const DELETE: RequestHandler = async ({
	params,
	url,
	locals: { safeGetSession, supabase }
}) => {
	const { devEui } = params;
	const { session, user } = await safeGetSession();
	if (!session || !user) {
		console.error('Session is null on device data API for device:', devEui);
		throw error(401, 'Unauthorized - Authentication required');
	}
	if (!devEui) {
		console.error('Device EUI is missing in the request');
		throw error(400, 'Bad Request - Device EUI is required');
	}
	try {
		// Create services directly
		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);

		const device = await deviceService.getDeviceByEui(devEui);
		if (!device) {
			throw error(404, 'Device not found');
		}
		// Check if the user is authorized to delete the device
		if (device.user_id !== user.id) {
			throw error(403, 'Forbidden - You do not have permission to delete this device');
		}

		// Delete the device
		const deviceDeleted = await deviceService.deleteDevice(devEui);

		if (!deviceDeleted) {
			throw error(500, 'Internal Server Error - Device could not be deleted');
		}

		// Return a proper Response object using json helper
		return json({ message: 'Device deleted successfully' });
	} catch (err) {
		console.error('Error deleting device data:', err);

		// If it's already a SvelteKit error, rethrow it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		// Otherwise throw a generic 500 error
		throw error(500, 'Internal Server Error');
	}
};
