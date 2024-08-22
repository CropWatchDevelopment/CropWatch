import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwDevicesService from '$lib/services/CwDevicesService';
import moment from 'moment';

export const GET: RequestHandler = async ({ params, locals: { supabase, safeGetSession } }) => {
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

    return new Response(JSON.stringify(device), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};

export const PUT: RequestHandler = async ({ params, request, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        throw redirect(303, '/auth/unauthorized');
    }

    const devEui = params.dev_eui;
    if (!devEui) {
        throw error(400, 'dev_eui is required');
    }

    const cwDevicesService = new CwDevicesService(supabase);

    try {
        const data = await request.json();
        
        // Perform validation on the incoming data
        // if (!data.name || !data.lat || !data.long || !data.upload_interval || !data.battery_changed_at) {
        //     throw error(400, 'All fields are required.');
        // }
        let existing_device = await cwDevicesService.getDeviceByEui(devEui);
        if (existing_device === null) throw error(500, 'Failed to find device to update');
        existing_device.name = data.name ?? existing_device.name;
        existing_device.battery_changed_at = data.battery_changed_at ?? existing_device.battery_changed_at;
        existing_device.lat = data.lat ?? existing_device.lat;
        existing_device.long = data.long ?? existing_device.long;
        existing_device.location_id = data.location_id ?? existing_device.location_id;

        // Format and validate the data
        const updatedDeviceData = {
            name: data.name,
            lat: parseFloat(data.lat),
            long: parseFloat(data.long),
            upload_interval: parseInt(data.upload_interval, 10),
            battery_changed_at: moment(data.battery_changed_at).toISOString(),
            location_id: existing_device.location_id,
        };

        // Update the device in the database
        const updatedDevice = await cwDevicesService.updateDevice(devEui, updatedDeviceData);

        if (!updatedDevice) {
            throw error(500, 'Error updating device');
        }

        return new Response(JSON.stringify(updatedDevice), {
            headers: {
                'Content-Type': 'application/json'
            }
        });

    } catch (err) {
        console.error('Error updating device:', err);
        throw error(500, 'Internal Server Error');
    }
};
