import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { ILocationService } from '$lib/interfaces/ILocationService';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const locationId = parseInt(params.locationId);

    if (isNaN(locationId)) {
      return json({ error: 'Invalid location ID' }, { status: 400 });
    }
    
    const locationService = container.get<ILocationService>(TYPES.LocationService);
    const locationUsers = await locationService.getLocationUsers(locationId);
    
    return json({ users: locationUsers }, { status: 200 });
  } catch (error) {
    console.error(`Error fetching users for location ${params.locationId}:`, error);
    return json({ error: 'Failed to fetch users' }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ params, request }) => {
  try {
    const locationId = parseInt(params.locationId);
    
    if (isNaN(locationId)) {
      return json({ error: 'Invalid location ID' }, { status: 400 });
    }
    
    const data = await request.json();
    const { email, permissionLevel, applyToDevices } = data;
    
    if (!email || permissionLevel === undefined) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const locationService = container.get<ILocationService>(TYPES.LocationService);
    const result = await locationService.addUserToLocation(
      locationId, 
      email, 
      permissionLevel, 
      applyToDevices || false
    );
    
    return json(result, { status: 200 });
  } catch (error) {
    console.error(`Error adding user to location ${params.locationId}:`, error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add user to location' 
    }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ params, request }) => {
  try {
    const locationId = parseInt(params.locationId);
    
    if (isNaN(locationId)) {
      return json({ error: 'Invalid location ID' }, { status: 400 });
    }
    
    const data = await request.json();
    const { userId, permissionLevel, applyToDevices, locationOwnerId } = data;
    
    if (!userId || permissionLevel === undefined || !locationOwnerId) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const locationService = container.get<ILocationService>(TYPES.LocationService);
    const result = await locationService.updateUserPermission(
      locationId,
      userId,
      locationOwnerId,
      permissionLevel,
      applyToDevices || false
    );
    
    return json(result, { status: 200 });
  } catch (error) {
    console.error(`Error updating permission for location ${params.locationId}:`, error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update permission' 
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, request }) => {
  try {
    const locationId = parseInt(params.locationId);
    
    if (isNaN(locationId)) {
      return json({ error: 'Invalid location ID' }, { status: 400 });
    }
    
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const locationOwnerId = url.searchParams.get('locationOwnerId');
    
    if (!userId || !locationOwnerId) {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    const locationService = container.get<ILocationService>(TYPES.LocationService);
    const result = await locationService.removeUserFromLocation(
      locationId,
      userId,
      parseInt(locationOwnerId)
    );
    
    return json(result, { status: 200 });
  } catch (error) {
    console.error(`Error removing user from location ${params.locationId}:`, error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove user from location' 
    }, { status: 500 });
  }
};