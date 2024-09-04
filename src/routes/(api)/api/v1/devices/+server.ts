import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwDevicesService from '$lib/services/CwDevicesService';
import CwDeviceOwnersService from '$lib/services/CwDeviceOwnersService';
import type { Tables } from '$lib/types/supabaseSchema';
import CwDeviceLocationsService from '$lib/services/CwDeviceLocationsService';

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



export const POST: RequestHandler = async ({ url, request, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    throw redirect(303, '/auth/unauthorized');
  }

  const form = await request.json();
  console.log(form);

  const cwDevicesService = new CwDevicesService(supabase);
  const cwDeviceOwnersService = new CwDeviceOwnersService(supabase);
  const cwDeviceLocationsService = new CwDeviceLocationsService(supabase);

  // Create the device in the cw_devices table
  const newDevice: Tables<'cw_devices'> = {
    dev_eui: form.deveui,
    name: form.name,
    type: form.type,
    upload_interval: form.uploadInterval,
    lat: form.lat,
    long: form.long,
    user_id: session.user.id,
    serial_number: form.serialNumber,
    location_id: form.locationId,
  };
  const newDeviceResponse = await cwDevicesService.addDevice(newDevice);
  if (!newDeviceResponse) {
    throw error(500, 'Error adding device');
  }

  // Give the Creator permission to the device
  const deviceOwner: Tables<'cw_device_owners'> = {
    dev_eui: newDevice.dev_eui,
    user_id: session.user.id,
    permission_level: 1,
  };
  const deviceOwnerResponse = await cwDeviceOwnersService.add(deviceOwner);
  if (!deviceOwnerResponse) {
    throw error(500, 'Error adding device owner');
  }

  //Add the device to this location
  const deviceLocation: Tables<'cw_device_locations'> = {
    dev_eui: newDevice.dev_eui,
    location_id: newDevice.location_id || -1,
  };
  const deviceLocationResult = await cwDeviceLocationsService.addDeviceLocation(deviceLocation);
  if (!deviceLocationResult) {
    throw error(500, 'Error adding device location');
  }

  return new Response(JSON.stringify(newDeviceResponse), {
    headers: {
      'Content-Type': 'application/json'
    }
  });

}