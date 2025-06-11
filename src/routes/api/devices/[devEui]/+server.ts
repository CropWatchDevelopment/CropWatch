import type { IDeviceService } from "$lib/interfaces/IDeviceService";
import { container } from "$lib/server/ioc.config";
import { TYPES } from "$lib/server/ioc.types";
import { error, json, type RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async ({ params, url, locals: { safeGetSession } }) => {
    const { devEui } = params;
    const { session, user } = await safeGetSession();
    if (!session) {
        console.error('Session is null on device data API for device:', devEui);
    }
    if (!devEui) {
        console.error('Device EUI is missing in the request');
        throw error(400, 'Bad Request - Device EUI is required');
    }

    try {
        // Get services from the container
        const deviceService = container.get<IDeviceService>(TYPES.DeviceService);
        const device = await deviceService.getDeviceWithTypeByEui(devEui);

        if (!device) {
            throw error(404, 'Device not found');
        }

        // Return a proper Response object using json helper
        return json(device);
    } catch (err) {
        console.error('Error fetching device data:', err);

        // If it's already a SvelteKit error, rethrow it
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }

        // Otherwise throw a generic 500 error
        throw error(500, 'Internal Server Error');
    }
}

export const DELETE: RequestHandler = async ({ params, url, locals: { safeGetSession } }) => {
    const { devEui } = params;
    const { session, user } = await safeGetSession();
    if (!session) {
        console.error('Session is null on device data API for device:', devEui);
    }
    if (!devEui) {
        console.error('Device EUI is missing in the request');
        throw error(400, 'Bad Request - Device EUI is required');
    }
    try {
        // Get services from the container
        const deviceService = container.get<IDeviceService>(TYPES.DeviceService);

        const device = await deviceService.getDeviceByEui(devEui);
        if (!device) {
            throw error(404, 'Device not found');
        }
        // Check if the user is authorized to delete the device
        if (device.user_id !== user.id) {
            throw error(403, 'Forbidden - You do not have permission to delete this device');
        }

        // Delete the device
        const deviceDeleted = await deviceService.deleteDevice(devEui);

        if (!deviceDeleted) {
            throw error(500, 'Internal Server Error - Device could not be deleted');
        }

        // Return a proper Response object using json helper
        return json({ message: 'Device deleted successfully' });
    } catch (err) {
        console.error('Error deleting device data:', err);

        // If it's already a SvelteKit error, rethrow it
        if (err && typeof err === 'object' && 'status' in err) {
            throw err;
        }

        // Otherwise throw a generic 500 error
        throw error(500, 'Internal Server Error');
    }
}