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
    const firstDataDate = new Date(url.searchParams.get('firstDataDate') ?? '');
    const lastDataDate = new Date(url.searchParams.get('lastDataDate') ?? '');
    // Check dates are provided
    if (!firstDataDate || !lastDataDate) {
        throw error(400, 'firstDataDate and lastDataDate are required');
    }
    // Check dates are valid
    if (isNaN(firstDataDate.getTime()) || isNaN(lastDataDate.getTime())) {
        throw error(400, 'firstDataDate and lastDataDate must be valid dates');
    }
    // Check last date is AFTER first date
    if (firstDataDate > lastDataDate) {
        throw error(400, 'firstDataDate must be less than lastDataDate');
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
    // const data = await cwDevicesService.getLatestDataByDeviceEui(device.dev_eui, deviceType.data_table ?? '');
    const data = await cwDevicesService.getDataRangeByDeviceEui(device.dev_eui, deviceType.data_table ?? '', firstDataDate, lastDataDate);
    if (!data) {
        throw error(500, 'Error fetching latest data');
    }

    const result = {
        data,
        device,
        deviceType,
    }
    return new Response(JSON.stringify(result), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};
