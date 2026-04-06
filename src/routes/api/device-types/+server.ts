import { ApiService, ApiServiceError } from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ fetch, locals }) => {
	const authToken = locals.jwtString ?? null;

	if (!authToken) {
		return json({ message: m.auth_not_authenticated() }, { status: 401 });
	}

	const api = new ApiService({
		fetchFn: fetch,
		authToken
	});

	try {
		return json(await api.getDeviceTypes());
	} catch (error) {
		const status = error instanceof ApiServiceError ? error.status : 500;
		return json({ message: m.devices_load_device_types_failed() }, { status });
	}
};
