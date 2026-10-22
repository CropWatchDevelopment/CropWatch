import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import type {
	BillingProductsResponse,
	DeviceDto,
	LocationDto,
	SubscriptionStateResponse
} from '$lib/api/api.dtos';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import { testEvent, testLocals, testServerConfig, type TestLocals } from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

const STATE: SubscriptionStateResponse = {
	billingMode: 'stripe',
	device: {
		subscriptionId: 'sub_1',
		status: 'active',
		seats: 5,
		minimumSeats: 3,
		assignedCount: 1,
		availableCount: 4,
		currentPeriodEnd: '2026-11-01T00:00:00.000Z',
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
	licenses: [
		{ id: 7, seatIndex: 0, status: 'assigned', devEui: 'A1', deviceName: 'Pump', manual: false }
	]
};

const PRODUCTS: BillingProductsResponse = {
	device: {
		id: 'price_device',
		name: 'Device license',
		description: null,
		recurringInterval: 'month',
		prices: [{ amountType: 'per_unit', priceAmount: 1500, priceCurrency: 'usd' }]
	},
	reporting: null
};

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

function run(locals: TestLocals, url = 'http://localhost/account/billing') {
	return load(testEvent<LoadEvent>({ locals, url }));
}

describe('billing load', () => {
	it('loads the subscription state, prices, devices and locations', async () => {
		const locals = testLocals();
		locals.services.billing.getSubscriptionState.mockResolvedValue(STATE);
		locals.services.billing.getBillingProducts.mockResolvedValue(PRODUCTS);
		locals.services.devices.getAllDevices.mockResolvedValue([
			{ dev_eui: 'A1', name: 'Pump', location_id: 8, extra: 'dropped' },
			{ dev_eui: 'B2', name: null, location_id: '8' },
			{ dev_eui: 'C3', location_id: null }
		] as unknown as DeviceDto[]);
		locals.services.locations.getLocations.mockResolvedValue([
			{ location_id: 8, name: 'Barn', owner_id: 'u1' }
		] as unknown as LocationDto[]);

		await expect(run(locals)).resolves.toEqual({
			authToken: 'jwt-token',
			state: STATE,
			products: PRODUCTS,
			// A device without a name shows its DevEUI; only numeric location ids are kept.
			devices: [
				{ dev_eui: 'A1', name: 'Pump', location_id: 8 },
				{ dev_eui: 'B2', name: 'B2', location_id: null },
				{ dev_eui: 'C3', name: 'C3', location_id: null }
			],
			locations: [{ location_id: 8, name: 'Barn' }],
			devicesLoadFailed: false,
			loadFailed: false
		});
		expect(locals.services.billing.getSubscriptionState).toHaveBeenCalledWith();
		expect(locals.services.billing.getBillingProducts).toHaveBeenCalledWith();
		expect(locals.services.devices.getAllDevices).toHaveBeenCalledWith();
		expect(locals.services.locations.getLocations).toHaveBeenCalledWith();
	});

	it('degrades each request independently, flagging a failed state or device load', async () => {
		const locals = testLocals();
		locals.services.billing.getSubscriptionState.mockRejectedValue(new Error('down'));
		locals.services.billing.getBillingProducts.mockRejectedValue(new Error('down'));
		locals.services.devices.getAllDevices.mockRejectedValue(new Error('down'));
		locals.services.locations.getLocations.mockRejectedValue(new Error('down'));

		await expect(run(locals)).resolves.toEqual({
			authToken: 'jwt-token',
			state: EMPTY_STATE,
			products: { device: null, reporting: null },
			devices: [],
			locations: [],
			devicesLoadFailed: true,
			loadFailed: true
		});
	});

	it('keeps the state when only the extras fail', async () => {
		const locals = testLocals();
		locals.services.billing.getSubscriptionState.mockResolvedValue(STATE);
		locals.services.billing.getBillingProducts.mockRejectedValue(new Error('down'));
		locals.services.devices.getAllDevices.mockResolvedValue([]);
		locals.services.locations.getLocations.mockResolvedValue([]);

		await expect(run(locals)).resolves.toMatchObject({
			state: STATE,
			devicesLoadFailed: false,
			loadFailed: false
		});
	});

	it('says when the device list could not be loaded, keeping everything else', async () => {
		const locals = testLocals();
		locals.services.billing.getSubscriptionState.mockResolvedValue(STATE);
		locals.services.billing.getBillingProducts.mockResolvedValue(PRODUCTS);
		locals.services.devices.getAllDevices.mockRejectedValue(new Error('down'));
		locals.services.locations.getLocations.mockResolvedValue([
			{ location_id: 8, name: 'Barn' }
		] as unknown as LocationDto[]);

		await expect(run(locals)).resolves.toEqual({
			authToken: 'jwt-token',
			state: STATE,
			products: PRODUCTS,
			devices: [],
			locations: [{ location_id: 8, name: 'Barn' }],
			devicesLoadFailed: true,
			loadFailed: false
		});
	});

	it('sends a signed-out visitor to login, coming back to this page', async () => {
		const locals = testLocals({ jwtString: null });

		const thrown = await Promise.resolve(
			run(locals, 'http://localhost/account/billing?checkout=success')
		).catch((error: unknown) => error);

		expect(isRedirect(thrown)).toBe(true);
		const { status, location } = thrown as { status: number; location: string };
		expect(status).toBe(303);
		const target = new URL(location, 'http://localhost');
		expect(target.pathname).toBe('/auth/login');
		expect(target.searchParams.get('redirect')).toBe('/account/billing?checkout=success');
		expect(target.searchParams.get('reason')).toBe('auth-required');
		expect(locals.services.billing.getSubscriptionState).not.toHaveBeenCalled();
	});

	it('sends the same four authenticated GET requests as before', async () => {
		const fake = createFakeFetch(({ path }) => {
			if (path.startsWith('/payments/subscriptions/state')) return jsonResponse(STATE);
			if (path.startsWith('/payments/products')) return jsonResponse(PRODUCTS);
			if (path.startsWith('/devices')) return jsonResponse({ data: [], total: 0 });
			return jsonResponse([]);
		});
		const config = { public: testPublicConfig(), server: testServerConfig() };
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => 'jwt-token',
			config: config.public,
			serverConfig: config.server
		});
		const event = testEvent<LoadEvent>({ url: 'http://localhost/account/billing' });
		event.locals = { jwt: null, jwtString: 'jwt-token', services, config };

		await expect(load(event)).resolves.toMatchObject({ state: STATE, loadFailed: false });

		expect(fake.requests.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
			'GET /devices?skip=0&take=1000',
			'GET /locations',
			'GET /payments/products',
			'GET /payments/subscriptions/state'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('Authorization')).toBe('Bearer jwt-token');
		}
	});
});
