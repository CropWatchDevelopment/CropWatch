import type { PageServerLoad } from './$types';

// `initialOverview`, not `overview`: the root layout already returns an
// `overview` (header device counts) and page data would shadow it.
export const load: PageServerLoad = async ({ locals, parent }) => {
	const { authToken } = await parent();
	if (!authToken) return { initialOverview: null };

	return { initialOverview: await locals.services.overview.getOverview('24h').catch(() => null) };
};
