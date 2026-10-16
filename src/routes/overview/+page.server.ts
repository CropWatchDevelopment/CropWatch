import { ApiService } from '$lib/api/api.service';
import type { PageServerLoad } from './$types';

// `initialOverview`, not `overview`: the root layout already returns an
// `overview` (header device counts) and page data would shadow it.
export const load: PageServerLoad = async ({ fetch, parent }) => {
	const { authToken } = await parent();
	if (!authToken) return { initialOverview: null };

	const api = new ApiService({ fetchFn: fetch, authToken });
	return { initialOverview: await api.getOverview('24h').catch(() => null) };
};
