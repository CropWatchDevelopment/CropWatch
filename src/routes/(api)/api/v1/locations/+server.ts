import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwLocationsService from '$lib/services/CwLocationsService';
import CwDevicesService from '$lib/services/CwDevicesService';
import type { Tables } from '$lib/types/supabaseSchema';

type CwLocations = Tables<'cw_locations'>;
type CwDevices = Tables<'cw_devices'>;

export const GET: RequestHandler = async ({ url, locals: { supabase, getSession } }) => {
  const session = await getSession();
  if (!session.user) {
    throw redirect(303, '/auth/unauthorized');
  }

  const includeDevices = url.searchParams.get('includeDevices') === 'true';
  const includeDevicesData = url.searchParams.get('includeDevicesData') === 'true';

  const cwLocationsService = new CwLocationsService(supabase);
  const cwDevicesService = new CwDevicesService(supabase);

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
  }

  return new Response(JSON.stringify(locations), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
