import { ApiService } from "$lib/api/api.service";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
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

    const allLocationDevices = await apiServiceInstance
        .getAllLocationDevices(locationId)
        .then((res) => res.data ?? [])
        .catch(() => []);

    return {
        allLocationDevices,
    };
}
