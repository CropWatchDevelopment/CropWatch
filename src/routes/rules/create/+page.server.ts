import { ApiService } from '$lib/api/api.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
	const authToken = locals.jwtString ?? null;
	const devEui = url.searchParams.get('dev_eui') ?? null;

	if (!authToken) {
		return { devices: [], devEui };
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	const raw = await api.getDevices().catch(() => []);
	const devices = Array.isArray(raw) ? raw : ((raw as Record<string, unknown>).data as typeof raw) ?? [];

	return { devices, authToken, devEui };
};
