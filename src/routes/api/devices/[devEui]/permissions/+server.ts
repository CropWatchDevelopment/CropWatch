import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IDeviceService } from '$lib/interfaces/IDeviceService';
import type { IAuthService } from '$lib/interfaces/IAuthService';
import { ForbiddenError, NotFoundError } from '$lib/errors/SpecificErrors';

// GET all permissions for a device
export const GET: RequestHandler = async ({ params }) => {
  try {
    const devEui = params.devEui;

    // Get services from IoC container
    const deviceService = container.get<IDeviceService>(TYPES.DeviceService);
    const authService = container.get<IAuthService>(TYPES.AuthService);

    // Check if the user is authenticated
    const sessionData = await authService.getSession();
    if (!sessionData) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const { user } = sessionData;

    // Get device to check if it exists
    const device = await deviceService.getDeviceByEui(devEui);
    if (!device) {
      return json({ error: 'Device not found' }, { status: 404 });
    }

    // Get device permissions
    // This approach calls a method we'll add to DeviceService
    const permissions = await deviceService.getDevicePermissions(devEui, user.id);

    return json(permissions);
  } catch (error) {
    console.error('Error fetching device permissions:', error);
    
    if (error instanceof ForbiddenError) {
      return json({ error: error.message }, { status: 403 });
    }
    
    if (error instanceof NotFoundError) {
      return json({ error: error.message }, { status: 404 });
    }

    return json({ error: 'Failed to fetch device permissions' }, { status: 500 });
  }
};

// POST add a new permission for a device
export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const devEui = params.devEui;
    const { user_id, permission_level } = await request.json();

    if (!user_id || permission_level === undefined) {
      return json({ error: 'User ID and permission level are required' }, { status: 400 });
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

    // Add device permission
    const permission = await deviceService.addDevicePermission(
      devEui, 
      user_id, 
      permission_level, 
      user.id
    );

    return json(permission, { status: 201 });
  } catch (error) {
    console.error('Error adding device permission:', error);

    if (error instanceof ForbiddenError) {
      return json({ error: error.message }, { status: 403 });
    }
    
    if (error instanceof NotFoundError) {
      return json({ error: error.message }, { status: 404 });
    }

    return json({ error: 'Failed to add device permission' }, { status: 500 });
  }
};