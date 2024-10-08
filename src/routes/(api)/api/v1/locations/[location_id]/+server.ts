import type { RequestHandler } from '@sveltejs/kit';
import { error, redirect } from '@sveltejs/kit';
import CwLocationsService from '$lib/services/CwLocationsService';
import CwDevicesService from '$lib/services/CwDevicesService';
import CwDeviceTypeService from '$lib/services/CwDeviceTypeService';
import type { Tables } from '$lib/types/supabaseSchema';
import CwLocationOwnersService from '$lib/services/CwLocationOwnersService';

type CwLocations = Tables<'cw_locations'>;
type CwDevices = Tables<'cw_devices'>;

export const GET: RequestHandler = async ({ url, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    const location_id: number = +(params.location_id ?? -1);
    if (location_id === -1) {
        throw error(400, 'Location ID is not supported');
    }
    const includeDevicesTypes = url.searchParams.get('includeDevicesTypes') === 'true';
    const includeDevices = url.searchParams.get('includeDevices') === 'true' || includeDevicesTypes;

    const cwLocationsService = new CwLocationsService(supabase);
    const cwLocationOwnersService = new CwLocationOwnersService(supabase);
    const cwDevicesService = new CwDevicesService(supabase);
    const cwDeviceTypeService = new CwDeviceTypeService(supabase);

    // Fetch main data
    const location: CwLocations = await cwLocationsService.getLocationById(location_id);

    if (!location) {
        throw error(500, 'Error fetching locations');
    }

    // Conditionally fetch related data
    if (includeDevices) {

        const devices: CwDevices[] = await cwDevicesService.getDevicesByLocationId(location.location_id);

        (location as any).devices = devices;

        if (includeDevicesTypes) {
            for (const device of (location as any).devices) {
                const deviceType = await cwDeviceTypeService.getById(device.type as number);
                device.deviceType = deviceType;
            }
        }
    }

    return new Response(JSON.stringify(location), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
};


export const PUT: RequestHandler = async ({ request, params, locals: { supabase, safeGetSession } }) => {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }


    const data = await request.json();

    const location_id: number = +(params.location_id ?? -1);
    if (location_id === -1) {
        throw error(400, 'Location ID is not supported');
    }

    const cwLocationsService = new CwLocationsService(supabase);

    let updateResult = await cwLocationsService.updateLocation(location_id, {
        name: data.name,
        lat: data.lat,
        long: data.long,
    });

    if (!updateResult) {
        throw error(500, 'Location Update failed');
    }

    return new Response(JSON.stringify(updateResult), {
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
