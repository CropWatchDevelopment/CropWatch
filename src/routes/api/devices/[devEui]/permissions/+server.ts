import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { ForbiddenError, NotFoundError } from '$lib/errors/SpecificErrors';

// GET all permissions for a device
export const GET: RequestHandler = async ({ params, locals }) => {
	try {
		const devEui = params.devEui;

		// Create services with direct instantiation
		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);

		// Check if the user is authenticated
		const session = locals.session;
		if (!session) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const { user } = session;

		// Get device to check if it exists
		const device = await deviceService.getDeviceByEui(devEui);
		if (!device) {
			throw new NotFoundError('Device not found');
		}

		// For now, return basic permissions info
		// TODO: Implement proper permission checking
		const permissions: any[] = [];

		return json({ permissions });
	} catch (error) {
		console.error('Error fetching device permissions:', error);

		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}

		if (error instanceof ForbiddenError) {
			return json({ error: error.message }, { status: 403 });
		}

		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
