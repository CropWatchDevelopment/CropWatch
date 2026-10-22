import type { PageServerLoad } from './$types';

// List page: the table loads its rows client-side (CwDataTable.loadData).
// The server only supplies the cheap entitlement summary for the upsell.
export const load: PageServerLoad = async ({ locals }) => {
	const authToken = locals.jwtString ?? null;
	if (!authToken) return { entitlements: null };

	const { billing } = locals.services;
	return { entitlements: await billing.getBillingEntitlements().catch(() => null) };
};
