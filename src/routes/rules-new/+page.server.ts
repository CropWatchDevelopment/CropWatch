import type { PageServerLoad } from './$types';

// The table fetches rule templates through the local /api/rules-new endpoint so
// search, paging, and deletes can refresh without duplicating list data in SSR.
export const load: PageServerLoad = async () => {
	return {};
};
