import type { PageServerLoad } from './$types';

// The reports list page uses CwDataTable with a client-side loadData callback that
// fetches, transforms, and paginates reports on demand. Pre-fetching here would
// duplicate that work and be thrown away immediately. The root layout supplies
// `authToken` and `session` to every route via layout data inheritance.
export const load: PageServerLoad = async () => {
	return {};
};
