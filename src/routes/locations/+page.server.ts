import type { PageServerLoad } from './$types';

// The locations list page uses CwDataTable with a client-side loadData callback,
// so no server-side data fetch is needed here. The root layout already supplies
// `authToken` and `session` to every route via layout data inheritance.
export const load: PageServerLoad = async () => {
	return {};
};
