import CwDeviceOwnersService from "$lib/services/CwDeviceOwnersService";
import CwDevicesService from "$lib/services/CwDevicesService";
import type { Tables } from "$lib/types/supabaseSchema";
import { error, redirect, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const locationId = params.location_id;
    if (!locationId) {
        throw error(400, 'Location ID is required');
    }

    const includeDeviceType = url.searchParams.get('includeDeviceType') === 'true';

    const cwDevicesService = new CwDevicesService(supabase);
    const cwDeviceOwnersService = new CwDeviceOwnersService(supabase);

    const devices: Tables<'cw_devices'>[] = await cwDevicesService.getDevicesByLocationId(+locationId);

    if (!devices) {
        throw error(500, 'Error fetching devices');
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