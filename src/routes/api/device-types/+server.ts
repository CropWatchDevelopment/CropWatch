import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, locals }) => {
	const authToken = locals.jwtString ?? null;

	if (!authToken) {
		return json({ message: 'Not authenticated.' }, { status: 401 });
	}

	const api = new ApiService({
		fetchFn: fetch,
		authToken
	});

	try {
		return json(await api.getDeviceTypes());
	} catch (error) {
		const status = error instanceof ApiServiceError ? error.status : 500;
		return json({ message: 'Failed to load device types.' }, { status });
	}
};
