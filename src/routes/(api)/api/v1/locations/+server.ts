import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwLocationsService from '$lib/services/CwLocationsService';
import CwDevicesService from '$lib/services/CwDevicesService';
import CwDeviceTypeService from '$lib/services/CwDeviceTypeService';
import type { Tables } from '$lib/types/supabaseSchema';

type CwLocations = Tables<'cw_locations'>;
type CwDevices = Tables<'cw_devices'>;

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
  const locations: CwLocations[] = await cwLocationsService.getAllLocations();

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
