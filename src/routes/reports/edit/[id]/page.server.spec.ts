import { isHttpError } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type {
	BillingEntitlements,
	ReportFormContextDto,
	ReportTemplateDto
} from '$lib/api/api.dtos';
import type { FetchFn } from '$lib/api/http/fetch-http-client';
import { m } from '$lib/paraglide/messages.js';
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

const TEMPLATE = { id: 5, name: 'Weekly cold room' } as ReportTemplateDto;
const CONTEXT = {
	devices: [],
	locations: [],
	communicationMethods: [],
	template: TEMPLATE
} as ReportFormContextDto;
const ENTITLEMENTS: BillingEntitlements = {
	billingMode: 'manual',
	isStaff: false,
	seats: 0,
	reporting: true
};

const apiError = (status: number) =>
	new ApiError(status, 'Error', {
		url: 'https://api.cropwatch.test/reports/form-context',
		payload: null
	});

function run(locals: TestLocals, id = '5') {
	return load(testEvent<LoadEvent>({ locals, params: { id } }));
}

/** The HTTP error the load throws, as `{ status, message }`. */
async function failure(locals: TestLocals, id = '5') {
	let thrown: unknown = new Error('expected the load to fail');
	try {
		await run(locals, id);
	} catch (error) {
		thrown = error;
	}
	if (!isHttpError(thrown)) throw thrown;
	return { status: thrown.status, message: thrown.body.message };
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

/** Mock `locals` with the entitlements answered. */
function signedIn() {
	const locals = testLocals();
	locals.services.billing.getBillingEntitlements.mockResolvedValue(ENTITLEMENTS);
	return locals;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('report edit load', () => {
	it('loads the form context for the template being edited, with the entitlements', async () => {
		const locals = signedIn();
		locals.services.reports.getReportFormContext.mockResolvedValue(CONTEXT);

		await expect(run(locals, '5')).resolves.toEqual({
			context: CONTEXT,
			entitlements: ENTITLEMENTS,
			authToken: TEST_JWT
		});
		expect(locals.services.reports.getReportFormContext).toHaveBeenCalledWith(5);
		expect(locals.services.billing.getBillingEntitlements).toHaveBeenCalledWith();
	});

	it('asks for the entitlements before the form context, and waits for both', async () => {
		const locals = testLocals();
		let finishEntitlements!: (value: BillingEntitlements) => void;
		locals.services.billing.getBillingEntitlements.mockReturnValue(
			new Promise((resolve) => (finishEntitlements = resolve))
		);
		locals.services.reports.getReportFormContext.mockResolvedValue(CONTEXT);

		const result = run(locals);
		const [entitlementsOrder] =
			locals.services.billing.getBillingEntitlements.mock.invocationCallOrder;
		const [contextOrder] = locals.services.reports.getReportFormContext.mock.invocationCallOrder;
		expect(entitlementsOrder).toBeLessThan(contextOrder);

		finishEntitlements(ENTITLEMENTS);
		await expect(result).resolves.toMatchObject({ entitlements: ENTITLEMENTS });
	});

	it('shows the template without entitlements when they cannot be loaded', async () => {
		const locals = testLocals();
		locals.services.billing.getBillingEntitlements.mockRejectedValue(new Error('API down'));
		locals.services.reports.getReportFormContext.mockResolvedValue(CONTEXT);

		await expect(run(locals)).resolves.toEqual({
			context: CONTEXT,
			entitlements: null,
			authToken: TEST_JWT
		});
	});

	it('answers 401 without a session, before calling the API', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(failure(locals)).resolves.toEqual({
			status: 401,
			message: m.error_unauthorized_title()
		});
		expect(locals.services.reports.getReportFormContext).not.toHaveBeenCalled();
		expect(locals.services.billing.getBillingEntitlements).not.toHaveBeenCalled();
	});

	it('answers 401 when the session has no user id', async () => {
		const locals = testLocals({ jwt: null });

		await expect(failure(locals)).resolves.toEqual({
			status: 401,
			message: m.error_unauthorized_title()
		});
		expect(locals.services.reports.getReportFormContext).not.toHaveBeenCalled();
	});

	it.each(['abc', '0', '-3', '1.5', ''])('answers 400 for the template id "%s"', async (id) => {
		const locals = testLocals();

		await expect(failure(locals, id)).resolves.toEqual({
			status: 400,
			message: m.reports_new_invalid_template_id()
		});
		expect(locals.services.reports.getReportFormContext).not.toHaveBeenCalled();
		expect(locals.services.billing.getBillingEntitlements).not.toHaveBeenCalled();
	});

	it('answers 404 when the API does not know the template', async () => {
		const locals = signedIn();
		locals.services.reports.getReportFormContext.mockRejectedValue(apiError(404));
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(locals)).resolves.toEqual({
			status: 404,
			message: m.reports_new_report_template_not_found()
		});
		expect(consoleError).not.toHaveBeenCalled();
	});

	it('answers 404 when the form context comes back without the template', async () => {
		const locals = signedIn();
		locals.services.reports.getReportFormContext.mockResolvedValue({ ...CONTEXT, template: null });

		await expect(failure(locals)).resolves.toEqual({
			status: 404,
			message: m.reports_new_report_template_not_found()
		});
	});

	it.each([
		['an API error other than 404', apiError(500)],
		['a network failure', new TypeError('Failed to fetch')],
		['a 404-shaped value that is not an API error', { status: 404 }]
	])('logs and answers 500 for %s', async (_label, cause) => {
		const locals = signedIn();
		locals.services.reports.getReportFormContext.mockRejectedValue(cause);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(locals)).resolves.toEqual({
			status: 500,
			message: m.reports_new_load_failed()
		});
		expect(consoleError).toHaveBeenCalledWith('Failed to load report template:', cause);
	});

	it('requests the entitlements and GET /reports/form-context?templateId=… as the session', async () => {
		const fake = createFakeFetch((request) =>
			jsonResponse(request.path.startsWith('/reports') ? CONTEXT : ENTITLEMENTS)
		);

		await expect(run(httpLocals(fake.fetch), '5')).resolves.toEqual({
			context: CONTEXT,
			entitlements: ENTITLEMENTS,
			authToken: TEST_JWT
		});

		expect(fake.requests.map((request) => `${request.method} ${request.path}`)).toEqual([
			'GET /payments/entitlements',
			'GET /reports/form-context?templateId=5'
		]);
		for (const request of fake.requests) {
			expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
		}
	});

	it('answers 404 when the API responds 404', async () => {
		const fake = createFakeFetch((request) =>
			request.path.startsWith('/reports')
				? jsonResponse({ message: 'Not found' }, { status: 404 })
				: jsonResponse(ENTITLEMENTS)
		);
		vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(failure(httpLocals(fake.fetch))).resolves.toEqual({
			status: 404,
			message: m.reports_new_report_template_not_found()
		});
	});
});
