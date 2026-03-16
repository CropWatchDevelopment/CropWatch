import { ApiService } from '$lib/api/api.service';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

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
	default: async ({ request, locals, fetch }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) {
			return fail(401, { error: 'Not authenticated' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim() ?? '';

		if (!name) {
			return fail(400, { error: 'Name is required', name });
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
			return fail(400, { error: 'Latitude must be a number', ...formValues });
		}
		if (longRaw && isNaN(long!)) {
			return fail(400, { error: 'Longitude must be a number', ...formValues });
		}

		const api = new ApiService({ fetchFn: fetch, authToken });

		try {
			const createdLocation = await api.createLocation({ name, description, group, lat, long });
			const location_id = readLocationId(createdLocation);

			if (!location_id) {
				return fail(502, {
					error: 'Location was created but the API response did not include location_id.',
					...formValues
				});
			}

			return {
				success: true,
				location_id
			};
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Failed to create location';
			return fail(500, { error: message, ...formValues });
		}
	}
};
