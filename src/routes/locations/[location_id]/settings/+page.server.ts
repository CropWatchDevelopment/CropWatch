import { ApiService, type LocationOwnerDto } from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	addPermission,
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
			locationOwners: [] as LocationOwnerDto[]
		};
	}

	const apiService = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const location = await apiService.getLocation(locationId).catch(() => null);
	const currentUserId = readUnknownString(locals.jwt?.sub);
	const locationOwnerId = readUnknownString((location as Record<string, unknown> | null)?.owner_id);

	if (locationOwnerId !== currentUserId) {
		const owner = location?.cw_location_owners?.find(
			(owner) =>
				readUnknownString(owner.user_id) === currentUserId &&
				readUnknownString(owner.permission_level) === '1'
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
		locationOwners: (location?.cw_location_owners ?? []) as LocationOwnerDto[]
	};
};

export const actions: Actions = {
	updateLocationName,
	addPermission,
	editPermission,
	updateUserPermissionLevel,
	removePermission
};
