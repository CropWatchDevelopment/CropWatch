import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BillingEntitlements } from '$lib/api/api.dtos';
import type { FetchFn } from '$lib/api/http/fetch-http-client';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

const ENTITLEMENTS: BillingEntitlements = {
	billingMode: 'stripe',
	isStaff: false,
	seats: 3,
	reporting: false
};

function run(locals: TestLocals) {
	return load(testEvent<LoadEvent>({ locals, url: 'http://localhost/reports' }));
}

/** `locals` whose services are the real repositories over `fetch`, as hooks.server.ts builds them. */
function httpLocals(fetch: FetchFn): TestLocals {
	const services = createServerServices({
		fetch,
		authToken: () => TEST_JWT,
		config: testPublicConfig(),
		serverConfig: testServerConfig()
	});
	return { ...testLocals(), services } as unknown as TestLocals;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('reports list load', () => {
	it('loads only the entitlement summary; the table fetches its own rows', async () => {
		const locals = testLocals();
		locals.services.billing.getBillingEntitlements.mockResolvedValue(ENTITLEMENTS);

		await expect(run(locals)).resolves.toEqual({ entitlements: ENTITLEMENTS });
		expect(locals.services.billing.getBillingEntitlements).toHaveBeenCalledTimes(1);
		expect(locals.services.billing.getBillingEntitlements).toHaveBeenCalledWith();
		expect(locals.services.reports.getReportTemplates).not.toHaveBeenCalled();
	});

	it('fails open without entitlements when the API fails', async () => {
		const locals = testLocals();
		locals.services.billing.getBillingEntitlements.mockRejectedValue(new Error('API down'));

		await expect(run(locals)).resolves.toEqual({ entitlements: null });
	});

	it('does not call the API without a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(run(locals)).resolves.toEqual({ entitlements: null });
		expect(locals.services.billing.getBillingEntitlements).not.toHaveBeenCalled();
	});

	it('requests GET /payments/entitlements as the session', async () => {
		const fake = createFakeFetch(() => jsonResponse(ENTITLEMENTS));

		await expect(run(httpLocals(fake.fetch))).resolves.toEqual({ entitlements: ENTITLEMENTS });

		const request = fake.onlyRequest();
		expect(request.method).toBe('GET');
		expect(request.path).toBe('/payments/entitlements');
		expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
	});

	it('fails open when the API answers with an error', async () => {
		const fake = createFakeFetch(() => jsonResponse({ message: 'Boom' }, { status: 503 }));
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(run(httpLocals(fake.fetch))).resolves.toEqual({ entitlements: null });
		expect(fake.onlyRequest().path).toBe('/payments/entitlements');
	});
});
