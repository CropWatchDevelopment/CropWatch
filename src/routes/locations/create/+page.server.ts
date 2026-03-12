import { ApiService } from '$lib/api/api.service';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

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

		if (latRaw && isNaN(lat!)) {
			return fail(400, { error: 'Latitude must be a number', name, description, group });
		}
		if (longRaw && isNaN(long!)) {
			return fail(400, { error: 'Longitude must be a number', name, description, group });
		}

		const api = new ApiService({ fetchFn: fetch, authToken });

		try {
			await api.createLocation({ name, description, group, lat, long });
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Failed to create location';
			return fail(500, { error: message, name, description, group });
		}

		throw redirect(303, '/locations');
	}
};
