import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwDevicesService from '$lib/services/CwDevicesService';
import CwDeviceOwnersService from '$lib/services/CwDeviceOwnersService';
import type { Tables } from '$lib/types/supabaseSchema';

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    throw redirect(303, '/auth/unauthorized');
  }

  const includeLocations = url.searchParams.get('includeLocations') === 'true';
  const includeOwners = url.searchParams.get('includeOwners') === 'true';
  const includeLatestData = url.searchParams.get('includeLatestData') === 'true';
  const includeDeviceType = url.searchParams.get('includeDeviceType') === 'true';

  const cwDevicesService = new CwDevicesService(supabase);
  const cwDeviceOwnersService = new CwDeviceOwnersService(supabase);

  // Fetch main data
  const devices: Tables<'cw_devices'>[] = await cwDevicesService.getAllDevices();

  if (!devices) {
    throw error(500, 'Error fetching devices');
  }

  if (includeOwners) {
    const ownersPromises = devices.map(device =>
      cwDeviceOwnersService.getByDeviceId(device.dev_eui)
    );
    const owners = await Promise.all(ownersPromises);

    devices.forEach((device, index) => {
      (device as any).owners = owners[index];
    });
  }

  if (includeLatestData) {
    const latestDataPromises = devices.map(async device => {
      const deviceType = await cwDevicesService.getDeviceTypeById(device.type);
      if (deviceType && deviceType.data_table) {
        return cwDevicesService.getLatestDataByDeviceEui(device.dev_eui, deviceType.data_table);
      }
      return null;
    });
    const latestData = await Promise.all(latestDataPromises);

    devices.forEach((device, index) => {
      (device as any).latestData = latestData[index];
    });
  }

  if (includeDeviceType) {
    for (let device of devices) {
      const deviceType = await cwDevicesService.getDeviceTypeById(device.type);
      device['deviceType'] = deviceType;
    }
  }

  return new Response(JSON.stringify(devices), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
