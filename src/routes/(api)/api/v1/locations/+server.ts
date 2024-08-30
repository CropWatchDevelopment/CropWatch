import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwLocationsService from '$lib/services/CwLocationsService';
import CwDevicesService from '$lib/services/CwDevicesService';
import CwDeviceTypeService from '$lib/services/CwDeviceTypeService';
import type { Tables } from '$lib/types/supabaseSchema';
import CwLocationOwnersService from '$lib/services/CwLocationOwnersService';

type CwLocations = Tables<'cw_locations'>;

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const includeDevicesTypes = url.searchParams.get('includeDevicesTypes') === 'true';
  const includeDevices = url.searchParams.get('includeDevices') === 'true' || includeDevicesTypes;

  const cwLocationsService = new CwLocationsService(supabase);
  const cwDevicesService = new CwDevicesService(supabase);
  const cwDeviceTypeService = new CwDeviceTypeService(supabase);

  // Fetch main data
  const locations: CwLocations[] = await cwLocationsService.getAllLocations(session.user.id);

  if (!locations) {
    throw error(500, 'Error fetching locations');
  }

  // Conditionally fetch related data
  if (includeDevices) {
    const devicesPromises = locations.map(location =>
      cwDevicesService.getDevicesByLocationId(location.location_id)
    );
    const devices = await Promise.all(devicesPromises);

    locations.forEach((location, index) => {
      (location as any).devices = devices[index];
    });

    if (includeDevicesTypes) {
      for (const location of locations) {
        for (const device of (location as any).devices) {
          const deviceType = await cwDeviceTypeService.getById(device.type as number);
          device.deviceType = deviceType;
        }
      }
    }
  }

  return new Response(JSON.stringify(locations), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};


export const POST: RequestHandler = async ({ request, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const cwLocationsService = new CwLocationsService(supabase);
  const cwLocationOwnersService = new CwLocationOwnersService(supabase);

  const data = await request.json();
  type CwLocationsInsertType = Tables<'cw_locations'>;
  type CwLocationOwnersInsertType = Tables<'cw_location_owners'>;

  const newLocation: CwLocationsInsertType = {
    description: data.description,
    lat: data.lat,
    long: data.long,
    name: data.name,
    owner_id: session.user.id,
  }
  const location = await cwLocationsService.addLocation(newLocation);
  if (!location) {
    throw error(500, 'Error creating location');
  }

  const newLocationOwner: CwLocationOwnersInsertType = {
    location_id: location.location_id,
    user_id: session.user.id,
    permission_level: 1,
    is_active: true,
    description: null,
  }
  const locationOwner = await cwLocationOwnersService.add(newLocationOwner);
  if (!locationOwner) {
    throw error(500, 'Error creating location owner');
  }
  return new Response(JSON.stringify(location), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};