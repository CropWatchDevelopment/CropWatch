import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwDevicesService from '$lib/services/CwDevicesService';

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;
    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    const cwDevicesService = new CwDevicesService(supabase);

    // Fetch main data
    const device = await cwDevicesService.getDeviceByEui(devEui);
    if (!device) {
        throw error(500, 'Error fetching device');
    }
    const deviceType = await cwDevicesService.getDeviceTypeById(device.type);
    if (!deviceType) {
        throw error(500, 'Error fetching device type');
    }
    const data = await cwDevicesService.getLatestDataByDeviceEui(device.dev_eui, deviceType.data_table ?? '');
    if (!data) {
        throw error(500, 'Error fetching latest data');
    }
    return new Response(JSON.stringify(data), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};
