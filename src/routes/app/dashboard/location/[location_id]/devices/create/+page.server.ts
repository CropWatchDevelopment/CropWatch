import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { Session, User as AuthUser } from '@supabase/supabase-js';
import type { DeviceInsert } from '$lib/models/Device';
import type { LocationUser } from '$lib/models/LocationUser';
import { PermissionLevel } from '$lib/models/LocationUser';

import { DeviceService } from '$lib/services/DeviceService';
import { LocationService } from '$lib/services/LocationService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import type { SupabaseClient } from '@supabase/supabase-js';

interface PageData {
  currentUser: AuthUser;
  usersInLocation: LocationUser[];
  permissionTypes: Array<[string, PermissionLevel]>;
  locationId: number;
}

export const load: PageServerLoad = async (event) => {
  const { params, locals } = event;
  const session = locals.session as Session | null; // Assuming session is directly on locals

  if (!session?.user) {
    throw fail(401, { message: 'Unauthorized' });
  }

  const currentUser = session.user;
  const location_id = parseInt(params.location_id || '0', 10);

  if (!location_id) {
    throw fail(400, { message: 'Invalid location ID' });
  }

  const supabase = locals.supabase as SupabaseClient;
  const errorHandler = new ErrorHandlingService();
  const locationRepository = new LocationRepository(supabase, errorHandler);
  const deviceRepository = new DeviceRepository(supabase, errorHandler);
  const locationService = new LocationService(locationRepository, deviceRepository);
  const locationUsers = await locationService.getLocationUsers(location_id);


  try {
    const usersInLocation = await locationService.getLocationUsers(location_id);
    const permissionTypes = Object.entries(PermissionLevel)
      .filter(([key]) => isNaN(Number(key))) // Get string keys from enum
      .map(([key, value]) => [key, value as PermissionLevel]);

    return {
      currentUser,
      usersInLocation: usersInLocation.filter(u => u.user_id !== currentUser.id),
      permissionTypes,
      locationId: location_id,
    } as PageData;
  } catch (error) {
    console.error('Error loading data for create device page:', error);
    throw fail(500, { message: 'Failed to load page data. ' + (error instanceof Error ? error.message : 'Unknown error') });
  }
};

export const actions: Actions = {
  createDevice: async (event) => {
    const { request, locals, params } = event;
    const session = locals.session as Session | null; // Assuming session is directly on locals

    if (!session?.user) {
      return fail(401, { message: 'Unauthorized' });
    }
    const currentUserId = session.user.id;
    const location_id = parseInt(params.location_id || '0', 10);

    if (!location_id) {
      return fail(400, { message: 'Invalid location ID' });
    }

    const formData = await request.formData();
    const name = formData.get('deviceName') as string;
    const devEui = formData.get('devEui') as string;
    // Ensure latitude and longitude are parsed as numbers
    const latitudeStr = formData.get('latitude') as string;
    const longitudeStr = formData.get('longitude') as string;
    const userPermissionsData = formData.get('userPermissionsData') as string;
    
    const latitude = latitudeStr ? parseFloat(latitudeStr) : undefined;
    const longitude = longitudeStr ? parseFloat(longitudeStr) : undefined;

    if (!name || !devEui || userPermissionsData === null) { // lat/long can be optional depending on DB
      return fail(400, { message: 'Missing required device information or permissions data.' });
    }
     if (latitude !== undefined && isNaN(latitude)) {
        return fail(400, { message: 'Invalid latitude value.'});
    }
    if (longitude !== undefined && isNaN(longitude)) {
        return fail(400, { message: 'Invalid longitude value.'});
    }

    let parsedUserPermissions: Array<{ userId: string; permissionLevelId: number }> = [];
    try {
      parsedUserPermissions = JSON.parse(userPermissionsData);
    } catch (error) {
      return fail(400, { message: 'Invalid format for user permissions data.' });
    }

    const supabase = locals.supabase as SupabaseClient;
    const errorHandler = new ErrorHandlingService();
    const deviceRepository = new DeviceRepository(supabase, errorHandler);
    const deviceService = new DeviceService(deviceRepository);

    const deviceToInsert: DeviceInsert = {
      dev_eui: devEui,
      name: name,
      lat: latitude, // Will be undefined if not provided, matching optional DB field
      long: longitude, // Will be undefined if not provided, matching optional DB field
      location_id: location_id,
      user_id: currentUserId, // User who is creating the device
      // type and upload_interval are omitted, assuming they are nullable or have DB defaults
    };

    try {
      const createdDevice = await deviceService.createDevice(deviceToInsert);
      if (!createdDevice) {
        // This case might be handled by deviceService.createDevice throwing an error
        return fail(500, { message: 'Failed to create device record. The service returned no device.' });
      }

      // Add current user as Admin owner in cw_device_owners
      await deviceRepository.addUserToDevice(createdDevice.dev_eui, currentUserId, PermissionLevel.Admin);

      // Add other users with specified permissions to cw_device_owners
      for (const perm of parsedUserPermissions) {
        if (perm.permissionLevelId !== PermissionLevel.Disabled) { // Only add if not disabled
          await deviceRepository.addUserToDevice(createdDevice.dev_eui, perm.userId, perm.permissionLevelId);
        }
      }

      // Successfully created device and permissions
      return { success: true, deviceId: createdDevice.dev_eui };
    } catch (error) {
      console.error('Error creating device or setting permissions:', error);
      // errorHandler.handleDatabaseError or a more specific error handler could be used
      return fail(500, { message: 'Failed to create device or set permissions. ' + (error instanceof Error ? error.message : 'Unknown error') });
    }
  }
};