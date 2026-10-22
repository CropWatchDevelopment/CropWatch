import type { LocationOwnerDto } from '$lib/api/api.dtos';
import { PermissionLevel } from '$lib/constants/permissions';
import { m } from '$lib/paraglide/messages.js';
import { isStaffEmail } from '$lib/utils/is-staff';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { toFiniteNumber } from '../location-overview';
import {
	addPermission,
	deleteLocation,
	editPermission,
	readUnknownString,
	removePermission,
	updateLocationCoordinates,
	updateLocationName,
	updateUserPermissionLevel
} from './location-settings-actions.server';

export const load: PageServerLoad = async ({ locals, params }) => {
	const authToken = locals.jwtString ?? null;
	const locationId = Number.parseInt(params.location_id ?? '', 10);

	if (!authToken || !Number.isFinite(locationId)) {
		return {
			locationId: Number.isFinite(locationId) ? locationId : null,
			locationName: '',
			locationGroup: '',
			coordinates: null as { lat: number; long: number } | null,
			mapZoom: null as number | null,
			devicePositions: [] as { lat: number | null; long: number | null }[],
			locationOwners: [] as LocationOwnerDto[],
			deletion: null as { deviceCount: number } | null
		};
	}

	const { locations } = locals.services;

	// The preflight is owner-only (403/404 otherwise): it decides whether the
	// danger zone shows at all, and how many devices still block the delete.
	const [location, deletePreflight, devices] = await Promise.all([
		locations.getLocation(locationId).catch(() => null),
		locations.getLocationDeletePreflight(locationId).catch(() => null),
		// Device positions back the "Centre on my devices" button.
		locals.services.devices
			.getAllLocationDevices(locationId)
			.then((res) => res.data ?? [])
			.catch(() => [])
	]);

	// The API answers 404 both for a missing location and for one the caller
	// may not see, so a failed lookup is "not found" here as well.
	if (!location) {
		error(404, { message: m.error_not_found_description() });
	}

	// Who may open settings: CropWatch staff (the API already lets them read
	// and manage every location), the location's owner, or a user holding an
	// explicit Admin grant on it. Everyone else gets a real 403 — `fail()` is
	// for form actions and, thrown from a load, surfaces as a 500.
	const currentUserId = readUnknownString(locals.jwt?.sub);
	const isStaff = isStaffEmail(locals.jwt?.email);
	const isOwner =
		currentUserId !== '' &&
		readUnknownString((location as Record<string, unknown>).owner_id) === currentUserId;
	const hasAdminGrant =
		currentUserId !== '' &&
		(location.cw_location_owners ?? []).some(
			(owner) =>
				readUnknownString(owner.user_id) === currentUserId &&
				readUnknownString(owner.permission_level) === String(PermissionLevel.ADMIN)
		);

	if (!isStaff && !isOwner && !hasAdminGrant) {
		error(403, { message: m.locations_permission_denied() });
	}

	const lat = toFiniteNumber(location.lat);
	const long = toFiniteNumber(location.long);

	return {
		locationId,
		locationName: String(location.name ?? `Location ${locationId}`),
		locationGroup: String(location.group ?? ''),
		coordinates: lat !== null && long !== null && !(lat === 0 && long === 0) ? { lat, long } : null,
		mapZoom: toFiniteNumber(location.map_zoom),
		devicePositions: devices.map((device) => ({
			lat: toFiniteNumber(device.lat),
			long: toFiniteNumber(device.long)
		})),
		locationOwners: (location.cw_location_owners ?? []) as LocationOwnerDto[],
		deletion: deletePreflight ? { deviceCount: deletePreflight.device_count } : null
	};
};

export const actions: Actions = {
	updateLocationName,
	updateLocationCoordinates,
	addPermission,
	editPermission,
	updateUserPermissionLevel,
	removePermission,
	deleteLocation
};
