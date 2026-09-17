import { ApiService } from '$lib/api/api.service';
import type { PageServerLoad } from './$types';

// List page: the table loads its rows client-side (CwDataTable.loadData).
// The server only supplies the cheap entitlement summary for the upsell.
export const load: PageServerLoad = async ({ locals, fetch }) => {
	const authToken = locals.jwtString ?? null;
	if (!authToken) return { entitlements: null };

	const api = new ApiService({ fetchFn: fetch, authToken });
	return { entitlements: await api.getBillingEntitlements().catch(() => null) };
};
