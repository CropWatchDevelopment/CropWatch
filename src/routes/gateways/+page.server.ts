import type { PageServerLoad } from './$types';

// The gateways list page uses CwDataTable with a client-side loadData callback.
// The root layout supplies authToken and session to every route via layout data inheritance.
export const load: PageServerLoad = async () => {
	return {};
};
