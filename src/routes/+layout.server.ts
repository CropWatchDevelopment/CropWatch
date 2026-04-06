import { ApiService } from '$lib/api/api.service';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, fetch }) => {

let profile;

	if (locals.jwtString) {
		const apiServiceInstance = new ApiService({
			fetchFn: fetch,
			authToken: locals.jwtString
		});

		profile = await apiServiceInstance.getUserProfile().catch((error) => {
			console.error('Failed to fetch authenticated user:', error);
		});
	}

	return {
		session: locals.jwt ?? null,
		authToken: locals.jwtString ?? null,
		profile,
	};
};
