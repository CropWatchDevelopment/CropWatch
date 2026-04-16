import type { PageServerLoad } from './$types';

// The rules list page uses CwDataTable with a client-side loadData callback that
// fetches, transforms, and paginates rules on demand. Pre-fetching here would
// duplicate that work and be thrown away immediately. The root layout supplies
// `authToken` and `session` to every route via layout data inheritance.
export const load: PageServerLoad = async () => {
	return {};
};
