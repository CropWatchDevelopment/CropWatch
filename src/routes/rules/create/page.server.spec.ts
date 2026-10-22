import { describe, expect, it } from 'vitest';
import type { RuleFormContextDto } from '$lib/api/api.dtos';
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

const EMPTY_CONTEXT: RuleFormContextDto = {
	devices: [],
	locations: [],
	actionTypes: [],
	template: null
};

const CONTEXT = {
	devices: [{ dev_eui: 'DEV-1', name: 'Greenhouse' }],
	locations: [{ location_id: 3, name: 'North' }],
	actionTypes: [{ id: 1, name: 'EMail', createdAt: '2026-01-01T00:00:00.000Z' }],
	template: null
} as unknown as RuleFormContextDto;

function run(locals: TestLocals, url = 'http://localhost/rules/create') {
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

describe('rule create load', () => {
	it('loads the form context and passes the session and preselected device through', async () => {
		const locals = testLocals();
		locals.services.rules.getRuleFormContext.mockResolvedValue(CONTEXT);

		await expect(run(locals, 'http://localhost/rules/create?dev_eui=DEV-1')).resolves.toEqual({
			context: CONTEXT,
			authToken: TEST_JWT,
			devEui: 'DEV-1'
		});
		expect(locals.services.rules.getRuleFormContext).toHaveBeenCalledTimes(1);
		expect(locals.services.rules.getRuleFormContext).toHaveBeenCalledWith();
	});

	it('has no preselected device without a dev_eui query parameter', async () => {
		const locals = testLocals();
		locals.services.rules.getRuleFormContext.mockResolvedValue(CONTEXT);

		await expect(run(locals)).resolves.toMatchObject({ devEui: null });
	});

	it('falls back to an empty form context when the API fails', async () => {
		const locals = testLocals();
		locals.services.rules.getRuleFormContext.mockRejectedValue(new Error('API down'));

		await expect(run(locals, 'http://localhost/rules/create?dev_eui=DEV-1')).resolves.toEqual({
			context: EMPTY_CONTEXT,
			authToken: TEST_JWT,
			devEui: 'DEV-1'
		});
	});

	it('does not call the API without a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(run(locals, 'http://localhost/rules/create?dev_eui=DEV-1')).resolves.toEqual({
			context: EMPTY_CONTEXT,
			authToken: null,
			devEui: 'DEV-1'
		});
		expect(locals.services.rules.getRuleFormContext).not.toHaveBeenCalled();
	});

	it('requests GET /rules/form-context as the session', async () => {
		const fake = createFakeFetch(() => jsonResponse(CONTEXT));

		await expect(run(httpLocals(fake.fetch))).resolves.toMatchObject({ context: CONTEXT });

		const request = fake.onlyRequest();
		expect(request.method).toBe('GET');
		expect(request.path).toBe('/rules/form-context');
		expect(request.headers.get('Authorization')).toBe(`Bearer ${TEST_JWT}`);
	});
});
