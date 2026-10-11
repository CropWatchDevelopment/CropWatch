import { ApiService, type LocationOwnerDto } from '$lib/api/api.service';
import { PermissionLevel } from '$lib/constants/permissions';
import { m } from '$lib/paraglide/messages.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	addPermission,
	deleteLocation,
	editPermission,
	readUnknownString,
	removePermission,
	updateLocationName,
	updateUserPermissionLevel
} from './location-settings-actions.server';

export const load: PageServerLoad = async ({ locals, fetch, params }) => {
	const authToken = locals.jwtString ?? null;
	const locationId = Number.parseInt(params.location_id ?? '', 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			locationId: Number.isFinite(locationId) ? locationId : null,
			locationName: '',
			locationGroup: '',
			locationOwners: [] as LocationOwnerDto[],
			deletion: null as { deviceCount: number } | null
		};
	}

	const apiService = new ApiService({
		fetchFn: fetch,
		authToken
	});

	// The preflight is owner-only (403/404 otherwise): it decides whether the
	// danger zone shows at all, and how many devices still block the delete.
	const [location, deletePreflight] = await Promise.all([
		apiService.getLocation(locationId).catch(() => null),
		apiService.getLocationDeletePreflight(locationId).catch(() => null)
	]);
	const currentUserId = readUnknownString(locals.jwt?.sub);
	const locationOwnerId = readUnknownString((location as Record<string, unknown> | null)?.owner_id);

	if (locationOwnerId !== currentUserId) {
		const owner = location?.cw_location_owners?.find(
			(owner) =>
				readUnknownString(owner.user_id) === currentUserId &&
				readUnknownString(owner.permission_level) === String(PermissionLevel.ADMIN)
		);
		if (!owner) {
			throw fail(403, {
				message: m.locations_permission_denied()
			});
		}
	}

	return {
		locationId,
		locationName: String(location?.name ?? `Location ${locationId}`),
		locationGroup: String(location?.group ?? ''),
		locationOwners: (location?.cw_location_owners ?? []) as LocationOwnerDto[],
		deletion: deletePreflight ? { deviceCount: deletePreflight.device_count } : null
	};
};

export const actions: Actions = {
	updateLocationName,
	addPermission,
	editPermission,
	updateUserPermissionLevel,
	removePermission,
	deleteLocation
};
