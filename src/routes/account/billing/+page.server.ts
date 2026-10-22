import type { BillingProductsResponse, SubscriptionStateResponse } from '$lib/api/api.dtos';
import { buildLoginPath } from '$lib/utils/auth-redirect';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const EMPTY_STATE: SubscriptionStateResponse = {
	billingMode: 'stripe',
	device: {
		subscriptionId: null,
		status: null,
		seats: 0,
		minimumSeats: 3,
		assignedCount: 0,
		availableCount: 0,
		currentPeriodEnd: null,
		cancelAtPeriodEnd: false
	},
	reporting: {
		subscriptionId: null,
		status: null,
		currentPeriodEnd: null,
		cancelAtPeriodEnd: false,
		entitled: false,
		manual: false
	},
	licenses: []
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const authToken = locals.jwtString ?? null;
	if (!authToken) {
		redirect(
			303,
			buildLoginPath({ redirectTo: `${url.pathname}${url.search}`, reason: 'auth-required' })
		);
	}

	const [stateResult, productsResult, devicesResult, locationsResult] = await Promise.allSettled([
		locals.services.billing.getSubscriptionState(),
		locals.services.billing.getBillingProducts(),
		locals.services.devices.getAllDevices(),
		locals.services.locations.getLocations()
	]);

	const state = stateResult.status === 'fulfilled' ? stateResult.value : EMPTY_STATE;
	const products: BillingProductsResponse =
		productsResult.status === 'fulfilled'
			? productsResult.value
			: { device: null, reporting: null };
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
		// The page does not read it, but page.data merges it over the root
		// layout's copy, and app.accessToken (what the browser services send)
		// follows page.data — so billing requests carry this load's token.
		authToken,
		state,
		products,
		devices,
		locations,
		// Without the device list there is nothing to assign a license to; the
		// page says so instead of saying that no device is free.
		devicesLoadFailed: devicesResult.status === 'rejected',
		loadFailed: stateResult.status === 'rejected'
	};
};
