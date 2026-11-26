import type { GroupDto } from '#lib/api/api.dtos.ts';
import { apiErrorMessage, apiErrorStatus } from '#lib/api/api-error.ts';
import { m } from '#lib/paraglide/messages.js';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

/**
 * The group picker's choices. A new location goes into the caller's own
 * organization (the API files it under their org context), so its groups are
 * that org's. Without them the form still creates the location.
 */
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { orgContext } = await parent();
	const orgId = orgContext?.org?.id ?? null;
	return {
		orgId,
		locationGroups:
			locals.jwtString && orgId
				? await locals.services.locationGroups.listGroups({ orgId }).catch(() => [] as GroupDto[])
				: ([] as GroupDto[])
	};
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readLocationId(payload: unknown): number | null {
	if (!isRecord(payload)) {
		return null;
	}

	const directLocationId = payload.location_id;
	if (typeof directLocationId === 'number' && Number.isFinite(directLocationId)) {
		return directLocationId;
	}

	if (typeof directLocationId === 'string') {
		const parsed = Number.parseInt(directLocationId, 10);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	for (const nestedKey of ['data', 'result']) {
		const nestedLocationId = readLocationId(payload[nestedKey]);
		if (nestedLocationId !== null) {
			return nestedLocationId;
		}
	}

	return null;
}

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, { error: m.auth_not_authenticated() });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';

		if (!name) {
			return fail(400, { error: m.validation_name_required(), name });
		}

		const description = formData.get('description')?.toString().trim() || null;
		const group = formData.get('group')?.toString().trim() || null;
		const latRaw = formData.get('lat')?.toString().trim();
		const longRaw = formData.get('long')?.toString().trim();
		const lat = latRaw ? Number(latRaw) : null;
		const long = longRaw ? Number(longRaw) : null;
		const formValues = {
			name,
			description: description ?? '',
			group: group ?? '',
			lat: latRaw ?? '',
			long: longRaw ?? ''
		};

		if (latRaw && isNaN(lat!)) {
			return fail(400, { error: m.locations_latitude_must_be_number(), ...formValues });
		}
		if (longRaw && isNaN(long!)) {
			return fail(400, { error: m.locations_longitude_must_be_number(), ...formValues });
		}

		const { locations } = locals.services;

		try {
			const createdLocation = await locations.createLocation({
				name,
				description,
				group,
				lat,
				long
			});
			const location_id = readLocationId(createdLocation);

			// 0 is a valid id: only a missing one is missing.
			if (location_id === null) {
				return fail(502, {
					error: m.locations_missing_location_id(),
					...formValues
				});
			}

			return {
				success: true,
				location_id
			};
		} catch (err: unknown) {
			return fail(apiErrorStatus(err), {
				error: apiErrorMessage(err, m.locations_create_failed()),
				...formValues
			});
		}
	}
};
