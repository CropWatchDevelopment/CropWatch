import { describe, expect, it } from 'vitest';
import type { BillingEntitlements, ReportFormContextDto } from '$lib/api/api.dtos';
import type { FetchFn } from '$lib/api/http/fetch-http-client';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	TEST_JWT,
	TEST_USER_ID,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];

const EMPTY_CONTEXT: ReportFormContextDto = {
	devices: [],
	locations: [],
	communicationMethods: [],
	template: null
};

const CONTEXT = {
	devices: [{ dev_eui: 'DEV-1', name: 'Greenhouse' }],
	locations: [{ location_id: 3, name: 'North' }],
	communicationMethods: [{ communicationMethodId: 1, name: 'Email', isActive: true }],
	template: null
} as unknown as ReportFormContextDto;

const ENTITLEMENTS: BillingEntitlements = {
	billingMode: 'stripe',
	isStaff: false,
	seats: 1,
	reporting: true
};

function jwt(overrides: Partial<IJWT> = {}): IJWT {
	return { sub: TEST_USER_ID, email: 'user@example.com', exp: 4102444800, ...overrides } as IJWT;
}

function run(locals: TestLocals, url = 'http://localhost/reports/create') {
	return load(testEvent<LoadEvent>({ locals, url }));
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

describe('report create load', () => {
	it('loads the form context and entitlements, and passes the session and user through', async () => {
		const locals = testLocals({
			jwt: jwt({
				user_metadata: {
					email: ' ada@example.com ',
					full_name: ' Ada Lovelace '
				} as IJWT['user_metadata']
			})
		});
		locals.services.reports.getReportFormContext.mockResolvedValue(CONTEXT);
		locals.services.billing.getBillingEntitlements.mockResolvedValue(ENTITLEMENTS);

		await expect(run(locals, 'http://localhost/reports/create?dev_eui=DEV-1')).resolves.toEqual({
			context: CONTEXT,
			entitlements: ENTITLEMENTS,
			authToken: TEST_JWT,
			devEui: 'DEV-1',
			currentUserEmail: 'ada@example.com',
			currentUserName: 'Ada Lovelace'
		});
		expect(locals.services.reports.getReportFormContext).toHaveBeenCalledTimes(1);
		expect(locals.services.reports.getReportFormContext).toHaveBeenCalledWith();
		expect(locals.services.billing.getBillingEntitlements).toHaveBeenCalledTimes(1);
	});

	it('starts both requests together', async () => {
		const locals = testLocals();
		let finishContext!: (context: ReportFormContextDto) => void;
		locals.services.reports.getReportFormContext.mockReturnValue(
			new Promise((resolve) => (finishContext = resolve))
		);
		locals.services.billing.getBillingEntitlements.mockResolvedValue(ENTITLEMENTS);

		const result = run(locals);
		await Promise.resolve();
		expect(locals.services.billing.getBillingEntitlements).toHaveBeenCalled();

		finishContext(CONTEXT);
		await expect(result).resolves.toMatchObject({ context: CONTEXT, entitlements: ENTITLEMENTS });
	});

	it.each([
		['the token email', jwt(), 'user@example.com', null],
		[
			'the metadata name when there is no full name',
			jwt({ user_metadata: { full_name: '  ', name: 'Ada' } as IJWT['user_metadata'] }),
			'user@example.com',
			'Ada'
		],
		[
			'nothing for blank values',
			jwt({
				email: '  ',
				user_metadata: { email: ' ', full_name: '', name: ' ' } as IJWT['user_metadata']
			}),
			null,
			null
		]
	])('names the current user from %s', async (_label, token, email, name) => {
		const locals = testLocals({ jwt: token });
		locals.services.reports.getReportFormContext.mockResolvedValue(CONTEXT);
		locals.services.billing.getBillingEntitlements.mockResolvedValue(ENTITLEMENTS);

		await expect(run(locals)).resolves.toMatchObject({
			devEui: null,
			currentUserEmail: email,
			currentUserName: name
		});
	});

	it('falls back to an empty form context and no entitlements when the API fails', async () => {
		const locals = testLocals();
		locals.services.reports.getReportFormContext.mockRejectedValue(new Error('API down'));
		locals.services.billing.getBillingEntitlements.mockRejectedValue(new Error('API down'));

		await expect(run(locals, 'http://localhost/reports/create?dev_eui=DEV-1')).resolves.toEqual({
			context: EMPTY_CONTEXT,
			entitlements: null,
			authToken: TEST_JWT,
			devEui: 'DEV-1',
			currentUserEmail: 'user@example.com',
			currentUserName: null
		});
	});

	it('degrades each request on its own', async () => {
		const locals = testLocals();
		locals.services.reports.getReportFormContext.mockResolvedValue(CONTEXT);
		locals.services.billing.getBillingEntitlements.mockRejectedValue(new Error('API down'));

		await expect(run(locals)).resolves.toMatchObject({ context: CONTEXT, entitlements: null });
	});

	it('does not call the API without a session', async () => {
		const locals = testLocals({
			jwtString: null,
			jwt: jwt({ user_metadata: { email: 'ada@example.com' } as IJWT['user_metadata'] })
		});

		await expect(run(locals, 'http://localhost/reports/create?dev_eui=DEV-1')).resolves.toEqual({
			context: EMPTY_CONTEXT,
			entitlements: null,
			authToken: null,
			devEui: 'DEV-1',
			currentUserEmail: 'ada@example.com',
			currentUserName: null
		});
		expect(locals.services.reports.getReportFormContext).not.toHaveBeenCalled();
		expect(locals.services.billing.getBillingEntitlements).not.toHaveBeenCalled();
	});

	it('has no current user without a token', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(run(locals)).resolves.toMatchObject({
			currentUserEmail: null,
			currentUserName: null
		});
	});

	it('requests GET /reports/form-context and GET /payments/entitlements as the session', async () => {
		const fake = createFakeFetch((request) =>
			jsonResponse(request.path.startsWith('/reports') ? CONTEXT : ENTITLEMENTS)
		);

		await expect(run(httpLocals(fake.fetch))).resolves.toMatchObject({
			context: CONTEXT,
			entitlements: ENTITLEMENTS
		});

		expect(fake.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
			'GET /reports/form-context',
			'GET /payments/entitlements'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});
});
