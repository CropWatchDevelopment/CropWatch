import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwDeviceOwnersService from '$lib/services/CwDeviceOwnersService';
import CwProfileService from '$lib/services/CwProfileService';

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  if (!params.dev_eui) {
    throw error(400, 'No Dev_eui Supplied');
  }

  const cwDeviceOwnersService = new CwDeviceOwnersService(supabase);
  const cwProfileService = new CwProfileService(supabase);

  const devicePermissions = await cwDeviceOwnersService.getByDeviceId(params.dev_eui);
  if (!devicePermissions) {
    throw error(500, 'No device found with that dev_eui');
  }

  for (let permission of devicePermissions) {
    permission.owner = await cwProfileService.getById(permission.user_id);
  }

  return new Response(JSON.stringify(devicePermissions), {
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
