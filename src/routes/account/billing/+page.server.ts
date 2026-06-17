import { ApiService } from '$lib/api/api.service';
import type { BillingProductsResponse, SubscriptionStateResponse } from '$lib/api/api.dtos';
import { buildLoginPath } from '$lib/utils/auth-redirect';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const EMPTY_STATE: SubscriptionStateResponse = {
	base: {
		subscriptionId: null,
		status: null,
		discountId: null,
		currentPeriodEnd: null,
		cancelAtPeriodEnd: false
	},
	device: { subscriptionId: null, seats: 0, assignedCount: 0, availableCount: 0 },
	licenses: []
};

export const load: PageServerLoad = async ({ fetch, locals, url }) => {
	const authToken = locals.jwtString ?? null;
	if (!authToken) {
		throw redirect(
			303,
			buildLoginPath({ redirectTo: `${url.pathname}${url.search}`, reason: 'auth-required' })
		);
	}

	const api = new ApiService({ fetchFn: fetch, authToken });

	const [stateResult, productsResult, devicesResult, locationsResult] = await Promise.allSettled([
		api.getSubscriptionState(),
		api.getBillingProducts(),
		api.getAllDevices(),
		api.getLocations()
	]);

	const state = stateResult.status === 'fulfilled' ? stateResult.value : EMPTY_STATE;
	const products: BillingProductsResponse =
		productsResult.status === 'fulfilled' ? productsResult.value : { base: null, device: null };
	const devices =
		devicesResult.status === 'fulfilled'
			? devicesResult.value.map((d) => ({
					dev_eui: d.dev_eui,
					name: d.name ?? d.dev_eui,
					location_id: typeof d.location_id === 'number' ? d.location_id : null
				}))
			: [];
	const locations =
		locationsResult.status === 'fulfilled'
			? locationsResult.value.map((l) => ({ location_id: l.location_id, name: l.name }))
			: [];

	return {
		authToken,
		state,
		products,
		devices,
		locations,
		loadFailed: stateResult.status === 'rejected'
	};
};
