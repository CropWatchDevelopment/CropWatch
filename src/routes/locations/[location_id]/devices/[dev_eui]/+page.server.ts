import { type PaginationQuery, ApiService } from '$lib/api/api.service';
import type { PageServerLoad } from '$types';


export const load: PageServerLoad = async ({ params, locals }) => {
    const authToken = locals.jwtString ?? null;
    const locationId = Number.parseInt(params.location_id, 10);

    if (!authToken || !Number.isFinite(locationId)) {
        return {
            allLocationDevices: []
        };
    }

    const apiServiceInstance = new ApiService({
        fetchFn: fetch,
        authToken
    });

    const pagination: PaginationQuery = {
        skip: 0,
        take: 144
    }

    const deviceData = await apiServiceInstance.getDeviceData(params.dev_eui, pagination);
    const latestData = await apiServiceInstance.getDeviceLatestData(params.dev_eui);
    

    return {
        deviceData: deviceData ?? [],
        latestData: latestData ?? null
    };
};
