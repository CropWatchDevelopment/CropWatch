import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import type { Tables } from '$lib/types/supabaseSchema';
import CwGatewaysService from '$lib/services/CwGatewaysService';
import CwDevicesService from '$lib/services/CwDevicesService';
import CwDeviceOwnersService from '$lib/services/CwDeviceOwnersService';

type profileType = Tables<'profiles'>;
type deviceType = Tables<'cw_devices'>;


export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  const currentUserId = session.user.id;
  const cwDeviceOwnersService = new CwDeviceOwnersService(supabase);

  // Fetch main data
  let owners = await cwDeviceOwnersService.getDeviceOwnerByOwnerId();

  if (!owners || owners.length === 0) {
    throw error(500, 'Error fetching device owners');
  }

  // Build a set of all devices the current user has access to
  const userDevices = new Set(
    owners
      .filter(user => user.id === currentUserId)
      .flatMap(user => user.cw_device_owners.map(deviceOwner => deviceOwner.dev_eui))
  );

  // Construct result based on shared device access
  let result = Object.values(
    owners.reduce((acc, user) => {
      // If the user has no email, skip it
      if (!user.email) return acc;

      // Filter devices to only include those the current user also has access to
      const sharedDevices = user.cw_device_owners.filter(deviceOwner =>
        userDevices.has(deviceOwner.dev_eui)
      );

      // If no shared devices, skip adding this user
      if (sharedDevices.length === 0) return acc;

      // If user with the same email already exists, add their shared devices to the sub-array
      if (acc[user.email]) {
        acc[user.email].devices = [
          ...acc[user.email].devices,
          ...sharedDevices.map(deviceOwner => ({
            dev_eui: deviceOwner.dev_eui,
            name: deviceOwner.cw_devices ? deviceOwner.cw_devices.name : null,
            last_login: deviceOwner.cw_devices ? deviceOwner.cw_devices.last_login : null,
          }))
        ];
      } else {
        // Otherwise, create a new entry for this user with shared devices
        acc[user.email] = {
          email: user.email,
          devices: sharedDevices.map(deviceOwner => ({
            dev_eui: deviceOwner.dev_eui,
            name: deviceOwner.cw_devices ? deviceOwner.cw_devices.name : null,
            last_login: deviceOwner.cw_devices ? deviceOwner.cw_devices.last_login : null,
          }))
        };
      }

      return acc;
    }, {})
  );

  //Filter CropWatch emails for safety
  if (!session.user.email.includes('cropwatch.io')) {
    result = result.filter(user => !user.email.includes('cropwatch.io'));
  }

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};