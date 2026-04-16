import { ApiService } from '$lib/api/api.service';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const userId = locals.jwt?.sub ?? null;
	const locationId = Number.parseInt(params.location_id, 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			allLocationDevices: [],
			currentLocation: null,
			hasSettings: false
		};
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	const [allLocationDevices, currentLocation] = await Promise.all([
		api.getAllLocationDevices(locationId)
			.then((res) => res.data ?? [])
			.catch(() => []),
		api.getLocation(locationId)
			.then((location) => location ?? null)
			.catch(() => null)
	]);

	// Show the settings link when the current user is an owner of this location
	// (permission_level 1 = owner, 2 = manager; the settings page enforces its own auth).
	const owners = Array.isArray(currentLocation?.cw_location_owners)
		? currentLocation.cw_location_owners
		: [];
	const currentOwner = userId ? owners.find((o) => o.user_id === userId) : null;
	const hasSettings = currentOwner != null && Number(currentOwner.permission_level) <= 2;

	return {
		allLocationDevices,
		currentLocation: currentLocation?.name ?? null,
		location: currentLocation,
		hasSettings
	};
};
