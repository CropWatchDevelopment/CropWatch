import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceService } from '$lib/services/DeviceService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceOwnersRepository } from '$lib/repositories/DeviceOwnersRepository';
import { AuthService } from '$lib/services/AuthService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { ForbiddenError, NotFoundError } from '$lib/errors/SpecificErrors';

// PUT update a specific permission
export const PUT: RequestHandler = async ({ request, params, locals }) => {
	try {
		const devEui = params.devEui;
		const permissionId = parseInt(params.permissionId);

		if (isNaN(permissionId)) {
			return json({ error: 'Invalid permission ID' }, { status: 400 });
		}

		const { permission_level } = await request.json();

		if (permission_level === undefined) {
			return json({ error: 'Permission level is required' }, { status: 400 });
		}

		// Get services
		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);
		const authService = new AuthService(locals.supabase, errorHandler);

		// Check if the user is authenticated
		const sessionData = await authService.getSession();
		if (!sessionData) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const { user } = sessionData;

		// Update the permission
		const updatedPermission = await deviceRepo.updateDevicePermission(
			permissionId,
			permission_level
		);

		return json(updatedPermission);
	} catch (error) {
		console.error('Error updating device permission:', error);

		if (error instanceof ForbiddenError) {
			return json({ error: error.message }, { status: 403 });
		}

		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}

		return json({ error: 'Failed to update device permission' }, { status: 500 });
	}
};

// DELETE remove a specific permission
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		const devEui = params.devEui;
		const permissionId = parseInt(params.permissionId);

		if (isNaN(permissionId)) {
			return json({ error: 'Invalid permission ID' }, { status: 400 });
		}

		// Get services
		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(locals.supabase, errorHandler);
		const deviceOwnersRepo = new DeviceOwnersRepository(locals.supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);
		const authService = new AuthService(locals.supabase, errorHandler);

		// Check if the user is authenticated
		const sessionData = await authService.getSession();
		if (!sessionData) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		const { user } = sessionData;

		// Get the permission to find the user to remove
		const permissions = await deviceOwnersRepo.findByDeviceEui(devEui);
		const permission = permissions.find((p: any) => p.id === permissionId);

		if (!permission) {
			return json({ error: 'Permission not found' }, { status: 404 });
		}

		// Remove the user from the device
		await deviceRepo.removeUserFromDevice(devEui, permission.user_id);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting device permission:', error);

		if (error instanceof ForbiddenError) {
			return json({ error: error.message }, { status: 403 });
		}

		if (error instanceof NotFoundError) {
			return json({ error: error.message }, { status: 404 });
		}

		return json({ error: 'Failed to delete device permission' }, { status: 500 });
	}
};
