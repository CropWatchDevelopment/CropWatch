import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IDeviceService } from '$lib/interfaces/IDeviceService';
import type { IAuthService } from '$lib/interfaces/IAuthService';
import { ForbiddenError, NotFoundError } from '$lib/errors/SpecificErrors';

// PUT update a specific permission
export const PUT: RequestHandler = async ({ request, params, locals: { safeGetSession} }) => {
  try {
    const devEui = params.devEui;
    const permissionId = parseInt(params.permissionId);
    const session = await safeGetSession();

    if (isNaN(permissionId)) {
      return json({ error: 'Invalid permission ID' }, { status: 400 });
    }
    
    const { permission_level } = await request.json();
    
    if (permission_level === undefined) {
      return json({ error: 'Permission level is required' }, { status: 400 });
    }

    // Get services from IoC container
    const deviceService = container.get<IDeviceService>(TYPES.DeviceService);

    // Check if the user is authenticated
    const sessionData = session;
    if (!sessionData) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const { user } = sessionData;
    
    // Update the permission
    const updatedPermission = await deviceService.updateDevicePermission(
      devEui,
      permissionId,
      permission_level,
      user.id
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
export const DELETE: RequestHandler = async ({ params }) => {
  try {
    const devEui = params.devEui;
    const permissionId = parseInt(params.permissionId);
    
    if (isNaN(permissionId)) {
      return json({ error: 'Invalid permission ID' }, { status: 400 });
    }

    // Get services from IoC container
    const deviceService = container.get<IDeviceService>(TYPES.DeviceService);
    const authService = container.get<IAuthService>(TYPES.AuthService);

    // Check if the user is authenticated
    const sessionData = await authService.getSession();
    if (!sessionData) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const { user } = sessionData;
    
    // Delete the permission
    await deviceService.deleteDevicePermission(devEui, permissionId, user.id);

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