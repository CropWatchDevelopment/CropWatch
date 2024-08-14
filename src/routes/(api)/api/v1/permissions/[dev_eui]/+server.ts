import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwDeviceOwnersService from '$lib/services/CwDeviceOwnersService';
import CwProfileService from '$lib/services/CwProfileService';
import type { Tables } from '$lib/types/supabaseSchema';

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

export const POST: RequestHandler = async ({ url, params, request, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  if (!params.dev_eui) {
    throw error(400, 'No Dev_eui Supplied');
  }

  // Extract data from the request body
  const formData = await request.json();
  const email = formData.email;
  const permissionLevel = parseInt(formData.permission_level, 10); // Convert permissionLevel to a number

  if (isNaN(permissionLevel)) {
    throw error(400, 'Invalid permission level supplied');
  }

  const cwDeviceOwnersService = new CwDeviceOwnersService(supabase);
  const cwProfileService = new CwProfileService(supabase);

  const user: Tables<'profiles'> = await cwProfileService.getByEmail(email);
  if (!user) {
    throw error(404, 'User Not Found');
  }

  // Assuming you have a method in the service to handle adding a new device owner
  const result = await cwDeviceOwnersService.add({
    dev_eui: params.dev_eui,
    id: 0, // Placeholder value
    owner_id: 0, // Placeholder value
    user_id: user.id,
    permission_level: permissionLevel,
});

  return new Response(JSON.stringify(result), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const DELETE: RequestHandler = async ({ params, request, locals: { supabase, safeGetSession } }) => {
  const session = await safeGetSession();
  if (!session.user) {
    return redirect(301, '/auth/unauthorized');
  }

  if (!params.dev_eui) {
    throw error(400, 'No Dev_eui Supplied');
  }

  // Extract the id from the request body
  const { id } = await request.json();
  
  if (id === null || id === undefined || id === -1) {
    throw error(400, 'No ID Supplied');
  }

  const cwDeviceOwnersService = new CwDeviceOwnersService(supabase);

  try {
    // Assuming you have a method in the service to handle deleting a device owner
    const result = await cwDeviceOwnersService.remove(id);

    if (result) {
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } else {
      return new Response(JSON.stringify({ success: false, error: 'Failed to delete permission' }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  } catch (err) {
    console.error('Failed to delete permission:', err);
    return new Response(JSON.stringify({ success: false, error: 'Failed to delete permission' }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
};