import { isRedirect } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AdminBillingCustomer } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	TEST_USER_ID,
	formRequest,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionName = keyof typeof actions;
type ActionEvent = Parameters<(typeof actions)['setBillingMode']>[0];

const CUSTOMER: AdminBillingCustomer = {
	userId: 'user-2',
	email: 'ada@example.com',
	fullName: 'Ada Lovelace',
	billingMode: 'stripe',
	deviceCount: 4,
	licensedDeviceCount: 3,
	seatCount: 3,
	manualSeatCount: 0,
	stripeCustomerId: 'cus_1',
	deviceSubscriptionId: 'sub_1',
	deviceSeats: 3,
	reportingStatus: 'active',
	reportingManual: false
};

/** A signed-in CropWatch staff member (the email decides). */
function staff(email = ' Staff@CropWatch.io ') {
	return testLocals({ jwt: { sub: TEST_USER_ID, email, exp: 4102444800 } as IJWT });
}

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: { message } });

function act(name: ActionName, locals: TestLocals, fields: Record<string, string> = {}) {
	return actions[name](testEvent<ActionEvent>({ locals, request: formRequest(fields) }));
}

async function redirectOf(result: Promise<unknown>) {
	const thrown = await result.then(
		() => new Error('expected a redirect'),
		(error: unknown) => error
	);
	if (!isRedirect(thrown)) throw thrown;
	return { status: thrown.status, location: thrown.location };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('admin billing load', () => {
	it('lists the billing customers for staff', async () => {
		const locals = staff();
		locals.services.billingAdmin.adminListBillingCustomers.mockResolvedValue([CUSTOMER]);

		await expect(load(testEvent<LoadEvent>({ locals }))).resolves.toEqual({
			customers: [CUSTOMER],
			loadFailed: false
		});
	});

	it('flags a failed load and shows no customers', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = apiError(403, 'Staff only');
		const locals = staff();
		locals.services.billingAdmin.adminListBillingCustomers.mockRejectedValue(failure);

		await expect(load(testEvent<LoadEvent>({ locals }))).resolves.toEqual({
			customers: [],
			loadFailed: true
		});
		expect(consoleError).toHaveBeenCalledWith('Failed to load billing customers:', failure);
	});

	it('sends everyone else to the dashboard, without calling the API', async () => {
		for (const locals of [
			testLocals(),
			testLocals({ jwtString: null }),
			testLocals({ jwtString: null, jwt: { email: 'staff@cropwatch.io' } as IJWT })
		]) {
			await expect(
				redirectOf(Promise.resolve(load(testEvent<LoadEvent>({ locals }))))
			).resolves.toEqual({ status: 303, location: '/' });
			expect(locals.services.billingAdmin.adminListBillingCustomers).not.toHaveBeenCalled();
		}
	});

	it('sends the same authenticated GET request as before', async () => {
		const fake = createFakeFetch(() => jsonResponse([CUSTOMER]));
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...staff(), services } as unknown as TestLocals;

		await expect(load(testEvent<LoadEvent>({ locals }))).resolves.toEqual({
			customers: [CUSTOMER],
			loadFailed: false
		});
		const request = fake.onlyRequest();
		expect(`${request.method} ${request.path}`).toBe('GET /payments/admin/customers');
		expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
	});
});

describe('admin billing actions: shared checks', () => {
	it('refuse a signed-out caller as not authenticated, before reading the form', async () => {
		for (const name of ['setBillingMode', 'setManualSeats', 'setReporting'] as const) {
			for (const locals of [
				testLocals({ jwtString: null }),
				testLocals({ jwtString: null, jwt: { email: 'staff@cropwatch.io' } as IJWT })
			]) {
				const request = formRequest({ userId: 'user-2' });
				const formData = vi.spyOn(request, 'formData');

				await expect(
					actions[name](testEvent<ActionEvent>({ locals, request }))
				).resolves.toMatchObject({ status: 401, data: { error: m.auth_not_authenticated() } });
				expect(formData).not.toHaveBeenCalled();
			}
		}
	});

	it('refuse a signed-in caller who is not staff as forbidden, before reading the form', async () => {
		for (const name of ['setBillingMode', 'setManualSeats', 'setReporting'] as const) {
			for (const locals of [
				testLocals(),
				testLocals({ jwt: { sub: TEST_USER_ID, email: null } as unknown as IJWT }),
				testLocals({ jwt: null })
			]) {
				const request = formRequest({ userId: 'user-2' });
				const formData = vi.spyOn(request, 'formData');

				await expect(
					actions[name](testEvent<ActionEvent>({ locals, request }))
				).resolves.toMatchObject({
					status: 403,
					data: { error: m.error_forbidden_description() }
				});
				expect(formData).not.toHaveBeenCalled();
			}
		}
	});

	it('require a user id', async () => {
		const locals = staff();

		for (const name of ['setBillingMode', 'setManualSeats', 'setReporting'] as const) {
			for (const fields of [{}, { userId: '   ' }] as Record<string, string>[]) {
				await expect(act(name, locals, fields)).resolves.toMatchObject({
					status: 400,
					data: { error: m.generic_error() }
				});
			}
		}
		expect(locals.services.billingAdmin.adminSetBillingMode).not.toHaveBeenCalled();
		expect(locals.services.billingAdmin.adminSetManualSeats).not.toHaveBeenCalled();
		expect(locals.services.billingAdmin.adminSetReportingManual).not.toHaveBeenCalled();
	});

	it("return the API's status and message, or 500 for other failures", async () => {
		const refused = staff();
		refused.services.billingAdmin.adminSetReportingManual.mockRejectedValue(
			apiError(404, 'Customer not found')
		);
		await expect(
			act('setReporting', refused, { userId: 'user-2', manual: 'true' })
		).resolves.toMatchObject({ status: 404, data: { error: 'Customer not found' } });

		const offline = staff();
		offline.services.billingAdmin.adminSetReportingManual.mockRejectedValue(
			new TypeError('Failed to fetch')
		);
		await expect(
			act('setReporting', offline, { userId: 'user-2', manual: 'true' })
		).resolves.toMatchObject({ status: 500, data: { error: m.generic_error() } });

		const unknown = staff();
		unknown.services.billingAdmin.adminSetReportingManual.mockRejectedValue({});
		await expect(
			act('setReporting', unknown, { userId: 'user-2', manual: 'true' })
		).resolves.toMatchObject({ status: 500, data: { error: m.generic_error() } });
	});
});

describe('setBillingMode', () => {
	it('switches a customer between Stripe and manual billing', async () => {
		const locals = staff();
		locals.services.billingAdmin.adminSetBillingMode.mockResolvedValue({});

		for (const billingMode of ['manual', 'stripe']) {
			await expect(
				act('setBillingMode', locals, { userId: ' user-2 ', billingMode })
			).resolves.toEqual({ success: true });
		}
		expect(locals.services.billingAdmin.adminSetBillingMode.mock.calls).toEqual([
			['user-2', 'manual'],
			['user-2', 'stripe']
		]);
	});

	it('refuses a missing or unknown mode as invalid input (400)', async () => {
		const locals = staff();

		for (const fields of [
			{ userId: 'user-2', billingMode: 'free' },
			{ userId: 'user-2', billingMode: 'MANUAL' },
			{ userId: 'user-2' }
		] as Record<string, string>[]) {
			await expect(act('setBillingMode', locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.generic_error() }
			});
		}
		expect(locals.services.billingAdmin.adminSetBillingMode).not.toHaveBeenCalled();
	});
});

describe('setManualSeats', () => {
	it('sets the whole number of manual seats', async () => {
		const locals = staff();
		locals.services.billingAdmin.adminSetManualSeats.mockResolvedValue({});

		for (const seats of ['5', '0', ' 12 ']) {
			await expect(act('setManualSeats', locals, { userId: 'user-2', seats })).resolves.toEqual({
				success: true
			});
		}
		expect(locals.services.billingAdmin.adminSetManualSeats.mock.calls).toEqual([
			['user-2', 5],
			['user-2', 0],
			['user-2', 12]
		]);
	});

	it('refuses a seat count that is not a whole number of 0 or more as invalid input (400)', async () => {
		const locals = staff();

		for (const fields of [
			{ userId: 'user-2' },
			...['', '-1', 'many', '2.9', '3.', '.5', '1e3', '9007199254740993'].map((seats) => ({
				userId: 'user-2',
				seats
			}))
		] as Record<string, string>[]) {
			await expect(act('setManualSeats', locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.admin_billing_seats_invalid() }
			});
		}
		expect(locals.services.billingAdmin.adminSetManualSeats).not.toHaveBeenCalled();
	});
});

describe('setReporting', () => {
	it("grants manual reporting only for 'true'", async () => {
		const locals = staff();
		locals.services.billingAdmin.adminSetReportingManual.mockResolvedValue({});

		for (const manual of ['true', 'false', 'yes']) {
			await expect(act('setReporting', locals, { userId: 'user-2', manual })).resolves.toEqual({
				success: true
			});
		}
		await act('setReporting', locals, { userId: 'user-2' });
		expect(locals.services.billingAdmin.adminSetReportingManual.mock.calls).toEqual([
			['user-2', true],
			['user-2', false],
			['user-2', false],
			['user-2', false]
		]);
	});
});

describe('admin billing actions over HTTP', () => {
	it('send the same authenticated requests as before', async () => {
		const fake = createFakeFetch(() => jsonResponse({}));
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => TEST_JWT,
			config: testPublicConfig(),
			serverConfig: testServerConfig()
		});
		const locals = { ...staff(), services } as unknown as TestLocals;

		await act('setBillingMode', locals, { userId: 'user/2', billingMode: 'manual' });
		await act('setManualSeats', locals, { userId: 'user/2', seats: '4' });
		await act('setReporting', locals, { userId: 'user/2', manual: 'false' });

		expect(fake.requests.map(({ method, path, body }) => [method, path, body])).toEqual([
			['PATCH', '/payments/admin/customers/user%2F2/billing-mode', { billingMode: 'manual' }],
			['PUT', '/payments/admin/customers/user%2F2/manual-seats', { seats: 4 }],
			['PATCH', '/payments/admin/customers/user%2F2/reporting', { manual: false }]
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});
