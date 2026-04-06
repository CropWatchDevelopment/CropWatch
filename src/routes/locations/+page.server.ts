import { ApiService } from "$lib/api/api.service";
import type { LayoutServerLoad } from "../$types";

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
    const session = locals.jwt ?? null;
    const authToken = locals.jwtString ?? null;

    if (!authToken) {
        return {
            session,
            devices: [],
            totalDeviceCount: 0,
            triggeredRulesCount: 0
        };
    }

    const apiServiceInstance = new ApiService({
        fetchFn: fetch,
        authToken
    });

    const allLocations = await apiServiceInstance.getAllLocations().then((res) => res.data ?? []).catch(() => []);

    return {
        session,
        authToken,
        allLocations,
    };
}