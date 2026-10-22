import { canManage, isValidPermissionLevel } from '$lib/constants/permissions';
import type { PageServerLoad } from './$types';
import { toFiniteNumber } from './location-overview';

export const load: PageServerLoad = async ({ locals, params }) => {
	const authToken = locals.jwtString ?? null;
	const userId = locals.jwt?.sub ?? null;
	const locationId = Number.parseInt(params.location_id, 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			allLocationDevices: [],
			currentLocation: null,
			locationInfo: null,
			hasSettings: false
		};
	}

	const { devices, locations } = locals.services;

	const [allLocationDevices, currentLocation] = await Promise.all([
		devices
			.getAllLocationDevices(locationId)
			.then((res) => res.data ?? [])
			.catch(() => []),
		locations
			.getLocation(locationId)
			.then((location) => location ?? null)
			.catch(() => null)
	]);

	// Show the settings link when the current user is an owner of this location
	// (permission_level 1 = owner, 2 = manager; the settings page enforces its own auth).
	const owners = Array.isArray(currentLocation?.cw_location_owners)
		? currentLocation.cw_location_owners
		: [];
	const currentOwner = userId ? owners.find((o) => o.user_id === userId) : null;
	// A missing level is no level: `Number(null)` (or `Number('')`) is 0, which
	// `canManage` would take for a manager.
	const level = Number(currentOwner?.permission_level ?? Number.NaN);
	const hasSettings = isValidPermissionLevel(level) && canManage(level);

	// Only the fields the overview renders; the owner list stays on the server.
	const locationInfo = currentLocation
		? {
				location_id: currentLocation.location_id,
				name: currentLocation.name,
				created_at: currentLocation.created_at,
				description:
					typeof currentLocation.description === 'string' ? currentLocation.description : null,
				group: typeof currentLocation.group === 'string' ? currentLocation.group : null,
				lat: toFiniteNumber(currentLocation.lat),
				long: toFiniteNumber(currentLocation.long),
				map_zoom: toFiniteNumber(currentLocation.map_zoom)
			}
		: null;

	return {
		allLocationDevices,
		currentLocation: currentLocation?.name ?? null,
		locationInfo,
		hasSettings
	};
};
