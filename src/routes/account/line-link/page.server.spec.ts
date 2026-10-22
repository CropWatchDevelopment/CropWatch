import { isRedirect } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import { m } from '$lib/paraglide/messages.js';
import { createServerServices } from '$lib/server/services';
import { createFakeFetch, jsonResponse, testPublicConfig } from '$lib/testing/http';
import {
	formRequest,
	testEvent,
	testLocals,
	testServerConfig,
	type TestLocals
} from '$lib/testing/server';
import { actions, load } from './+page.server';

type LoadEvent = Parameters<typeof load>[0];
type ActionEvent = Parameters<(typeof actions)['default']>[0];

const apiError = (status: number, message: string) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload: { message } });

function act(locals: TestLocals, fields: Record<string, string> = {}) {
	return actions.default(testEvent<ActionEvent>({ locals, request: formRequest(fields) }));
}

/** What the action threw (a redirect) or returned (a failure). */
const settle = (result: ReturnType<typeof act>) =>
	Promise.resolve(result).catch((error: unknown) => error);

describe('LINE link load', () => {
	it('reads the trimmed link token and the profile email', async () => {
		const data = await load(
			testEvent<LoadEvent>({
				url: 'http://localhost/account/line-link?linkToken=%20tok-1%20',
				parent: { profile: { email: 'ada@example.com' }, session: { email: 'other@example.com' } }
			})
		);

		expect(data).toEqual({ linkToken: 'tok-1', email: 'ada@example.com' });
	});

	it('falls back to the session email, and to nulls', async () => {
		await expect(
			load(
				testEvent<LoadEvent>({
					url: 'http://localhost/account/line-link?linkToken=%20%20',
					parent: { session: { email: 'a@b.c' } }
				})
			)
		).resolves.toEqual({ linkToken: null, email: 'a@b.c' });

		await expect(
			load(testEvent<LoadEvent>({ url: 'http://localhost/account/line-link' }))
		).resolves.toEqual({ linkToken: null, email: null });
	});
});

describe('LINE link action', () => {
	it('starts the link and sends the user to the LINE dialog with the token and nonce', async () => {
		const locals = testLocals();
		locals.services.line.startLineLink.mockResolvedValue({ nonce: 'n/1 +' });

		const thrown = await settle(act(locals, { linkToken: ' tok&1 ' }));

		expect(isRedirect(thrown)).toBe(true);
		expect(thrown).toMatchObject({
			status: 303,
			location: 'https://access.line.me/dialog/bot/accountLink?linkToken=tok%261&nonce=n%2F1%20%2B'
		});
		expect(locals.services.line.startLineLink).toHaveBeenCalledWith();
	});

	it('requires a session', async () => {
		const locals = testLocals({ jwtString: null });

		await expect(act(locals, { linkToken: 'tok' })).resolves.toMatchObject({
			status: 401,
			data: { error: m.auth_not_authenticated() }
		});
		expect(locals.services.line.startLineLink).not.toHaveBeenCalled();
	});

	it('requires a link token', async () => {
		const locals = testLocals();

		const missing: Record<string, string>[] = [{}, { linkToken: '   ' }];
		for (const fields of missing) {
			await expect(act(locals, fields)).resolves.toMatchObject({
				status: 400,
				data: { error: m.line_link_missing_token() }
			});
		}
		expect(locals.services.line.startLineLink).not.toHaveBeenCalled();
	});

	it("returns the API's status and message when the link cannot start", async () => {
		const locals = testLocals();
		locals.services.line.startLineLink.mockRejectedValue(apiError(409, 'Already linked'));

		await expect(act(locals, { linkToken: 'tok' })).resolves.toMatchObject({
			status: 409,
			data: { error: 'Already linked' }
		});
	});

	it('fails with 500 and the LINE fallback for other failures', async () => {
		const failing = testLocals();
		failing.services.line.startLineLink.mockRejectedValue(new TypeError('Failed to fetch'));
		await expect(act(failing, { linkToken: 'tok' })).resolves.toMatchObject({
			status: 500,
			data: { error: m.line_link_error() }
		});

		const silent = testLocals();
		silent.services.line.startLineLink.mockRejectedValue({});
		await expect(act(silent, { linkToken: 'tok' })).resolves.toMatchObject({
			status: 500,
			data: { error: m.line_link_error() }
		});
	});

	it('sends one authenticated POST to /line/link-start', async () => {
		const fake = createFakeFetch(() => jsonResponse({ nonce: 'abc' }));
		const config = { public: testPublicConfig(), server: testServerConfig() };
		const services = createServerServices({
			fetch: fake.fetch,
			authToken: () => 'jwt-token',
			config: config.public,
			serverConfig: config.server
		});
		const event = testEvent<ActionEvent>({ request: formRequest({ linkToken: 'tok' }) });
		event.locals = { jwt: null, jwtString: 'jwt-token', services, config };

		const thrown = await Promise.resolve(actions.default(event)).catch((error: unknown) => error);

		expect(thrown).toMatchObject({
			status: 303,
			location: 'https://access.line.me/dialog/bot/accountLink?linkToken=tok&nonce=abc'
		});
		const request = fake.onlyRequest();
		expect(request.method).toBe('POST');
		expect(request.path).toBe('/line/link-start');
		expect(request.headers.get('Authorization')).toBe('Bearer jwt-token');
	});
});
