import { ApiService } from '$lib/api/api.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const locationId = Number.parseInt(params.location_id, 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			allLocationDevices: [],
			currentLocation: null
		};
	}

	const apiServiceInstance = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const [allLocationDevices, currentLocation] = await Promise.all([
		apiServiceInstance
			.getAllLocationDevices(locationId)
			.then((res) => res.data ?? [])
			.catch(() => []),
		apiServiceInstance
			.getLocation(locationId)
			.then((location) => location.name ?? null)
			.catch(() => null)
	]);

	return {
		allLocationDevices,
		currentLocation
	};
};
