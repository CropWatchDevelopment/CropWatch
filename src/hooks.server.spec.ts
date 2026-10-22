import { isRedirect, type RequestEvent } from '@sveltejs/kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeFetch, jsonResponse } from '$lib/testing/http';
import { handleError, originalHandle, paraglideHandle } from './hooks.server';

function encode(value: unknown): string {
	return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function jwt(expiresInSeconds: number): string {
	const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
	return [encode({ alg: 'HS256', typ: 'JWT' }), encode({ sub: 'user-1', exp }), 'sig'].join('.');
}

type AuthServer = 'accepts' | 'refuses' | 'unreachable';

/** The Supabase Auth server's answer to `GET /auth/v1/user` (HS256 tokens are verified there). */
function authAnswer(auth: AuthServer) {
	if (auth === 'unreachable') return Promise.reject(new TypeError('fetch failed'));
	return auth === 'accepts'
		? jsonResponse({ id: 'user-1' })
		: jsonResponse({ code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' }, { status: 403 });
}

type RefreshServer = 'renews' | 'refuses' | 'unreachable';

/** The token Supabase Auth issues when it renews a session. */
const RENEWED_TOKEN = jwt(3600);

/** The Supabase Auth server's answer to `POST /auth/v1/token?grant_type=refresh_token`. */
function refreshAnswer(refresh: RefreshServer) {
	if (refresh === 'unreachable') return Promise.reject(new TypeError('fetch failed'));
	return refresh === 'renews'
		? jsonResponse({
				access_token: RENEWED_TOKEN,
				refresh_token: 'refresh-2',
				expires_in: 3600,
				expires_at: Math.floor(Date.now() / 1000) + 3600
			})
		: jsonResponse({ error_code: 'refresh_token_already_used' }, { status: 400 });
}

const isAuthRequest = (url: string) => new URL(url).pathname.startsWith('/auth/v1/');
const isRefreshRequest = (url: string) => new URL(url).pathname === '/auth/v1/token';

function event(
	path: string,
	token?: string,
	auth: AuthServer = 'accepts',
	refresh?: { token: string; server: RefreshServer }
) {
	const fake = createFakeFetch((request) => {
		if (isRefreshRequest(request.url)) return refreshAnswer(refresh!.server);
		return isAuthRequest(request.url) ? authAnswer(auth) : jsonResponse({ online: 0, offline: 0 });
	});
	const cookies = {
		get: vi.fn((name: string) =>
			name === 'jwt' ? token : name === 'jwt_refresh' ? refresh?.token : undefined
		),
		set: vi.fn(),
		delete: vi.fn()
	};
	const requestEvent = {
		url: new URL(`http://localhost${path}`),
		request: new Request(`http://localhost${path}`),
		cookies,
		fetch: fake.fetch,
		locals: {}
	} as unknown as RequestEvent;
	return { requestEvent, cookies, fake };
}

function html(body = '<html lang="%paraglide.lang%" dir="%paraglide.dir%"></html>') {
	return new Response(body, { headers: { 'content-type': 'text/html' } });
}

async function redirectOf(result: unknown) {
	const thrown = await Promise.resolve(result).then(
		() => null,
		(error: unknown) => error
	);
	if (!isRedirect(thrown)) throw new Error('expected a redirect');
	return thrown;
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe('originalHandle', () => {
	it('verifies the session with Supabase Auth and builds services authenticated as it', async () => {
		const token = jwt(3600);
		const { requestEvent, fake } = event('/locations', token);
		const resolve = vi.fn(async () => html());

		await originalHandle({ event: requestEvent, resolve });

		expect(requestEvent.locals.jwtString).toBe(token);
		expect(requestEvent.locals.jwt).toMatchObject({ sub: 'user-1' });
		const [verification] = fake.requests;
		expect(new URL(verification.url).pathname).toBe('/auth/v1/user');
		expect(verification.headers.get('authorization')).toBe(`Bearer ${token}`);
		await requestEvent.locals.services.devices.getDeviceStatuses();
		expect(fake.requests.at(-1)?.headers.get('authorization')).toBe(`Bearer ${token}`);
		expect(resolve).toHaveBeenCalledWith(requestEvent);
	});

	it('rejects a token Supabase Auth refuses (forged or revoked): clears it and redirects', async () => {
		const { requestEvent, cookies } = event('/locations', jwt(3600), 'refuses');

		const redirect = await redirectOf(originalHandle({ event: requestEvent, resolve: vi.fn() }));

		expect(cookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
		expect(redirect.location).toContain('auth-required');
		expect(requestEvent.locals.jwt).toBeNull();
		expect(requestEvent.locals.jwtString).toBeNull();
	});

	it('keeps the session on its decoded claims while Supabase Auth is unreachable', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const token = jwt(3600);
		const { requestEvent, cookies } = event('/locations', token, 'unreachable');

		await originalHandle({ event: requestEvent, resolve: vi.fn(async () => html()) });

		expect(requestEvent.locals.jwtString).toBe(token);
		expect(requestEvent.locals.jwt).toMatchObject({ sub: 'user-1' });
		expect(cookies.delete).not.toHaveBeenCalled();
		expect(warn).toHaveBeenCalled();
	});

	it('redirects to login (auth-required) when a protected route has no session', async () => {
		const { requestEvent } = event('/locations?x=1');

		const redirect = await redirectOf(originalHandle({ event: requestEvent, resolve: vi.fn() }));

		expect(redirect.status).toBe(303);
		expect(redirect.location).toContain('/auth/login');
		expect(redirect.location).toContain('auth-required');
		expect(requestEvent.locals.jwtString).toBeNull();
	});

	it('clears an expired session and redirects with the expired reason', async () => {
		const { requestEvent, cookies, fake } = event('/locations', jwt(-60));

		const redirect = await redirectOf(originalHandle({ event: requestEvent, resolve: vi.fn() }));

		expect(cookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
		expect(redirect.location).toContain('expired');
		expect(fake.requests).toHaveLength(0);
	});

	it('redirects a malformed token on a protected route', async () => {
		const { requestEvent } = event('/rules', 'not-a-jwt');

		const redirect = await redirectOf(originalHandle({ event: requestEvent, resolve: vi.fn() }));

		expect(redirect.location).toContain('auth-required');
		expect(requestEvent.locals.jwt).toBeNull();
	});

	it('lets /auth and public paths through without a session, with anonymous services', async () => {
		for (const path of ['/auth/login', '/manifest.webmanifest']) {
			const { requestEvent, fake } = event(path);
			await originalHandle({ event: requestEvent, resolve: vi.fn(async () => html()) });
			await requestEvent.locals.services.devices.getDeviceStatuses();
			expect(fake.onlyRequest().headers.get('authorization')).toBeNull();
		}
	});

	it('lets /auth through with an expired, malformed or refused token, clearing it', async () => {
		for (const [token, auth] of [
			[jwt(-60), 'accepts'],
			['not-a-jwt', 'accepts'],
			[jwt(3600), 'refuses']
		] as const) {
			const { requestEvent, cookies } = event('/auth/login', token, auth);
			await expect(
				originalHandle({ event: requestEvent, resolve: vi.fn(async () => html()) })
			).resolves.toBeInstanceOf(Response);
			expect(cookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(requestEvent.locals.jwtString).toBeNull();
		}
	});

	describe('session refresh', () => {
		const refreshRequests = (fake: ReturnType<typeof event>['fake']) =>
			fake.requests.filter((request) => isRefreshRequest(request.url));

		it('renews an expired session with its refresh token and authenticates as the new one', async () => {
			const { requestEvent, cookies, fake } = event('/locations', jwt(-60), 'accepts', {
				token: 'refresh-1',
				server: 'renews'
			});

			await originalHandle({ event: requestEvent, resolve: vi.fn(async () => html()) });

			expect(refreshRequests(fake).map((request) => request.body)).toEqual([
				{ refresh_token: 'refresh-1' }
			]);
			expect(cookies.set).toHaveBeenCalledWith('jwt', RENEWED_TOKEN, expect.any(Object));
			expect(cookies.set).toHaveBeenCalledWith('jwt_refresh', 'refresh-2', expect.any(Object));
			expect(requestEvent.locals.jwtString).toBe(RENEWED_TOKEN);
			expect(cookies.delete).not.toHaveBeenCalled();
		});

		it('renews when the session cookie is gone (it expires with its token)', async () => {
			const { requestEvent } = event('/', undefined, 'accepts', {
				token: 'refresh-1',
				server: 'renews'
			});

			await originalHandle({ event: requestEvent, resolve: vi.fn(async () => html()) });

			expect(requestEvent.locals.jwtString).toBe(RENEWED_TOKEN);
		});

		it('renews a token about to run out, and leaves one with time left alone', async () => {
			const soon = event('/rules', jwt(120), 'accepts', { token: 'r', server: 'renews' });
			await originalHandle({ event: soon.requestEvent, resolve: vi.fn(async () => html()) });
			expect(refreshRequests(soon.fake)).toHaveLength(1);

			const token = jwt(3600);
			const fresh = event('/rules', token, 'accepts', { token: 'r', server: 'renews' });
			await originalHandle({ event: fresh.requestEvent, resolve: vi.fn(async () => html()) });
			expect(refreshRequests(fresh.fake)).toHaveLength(0);
			expect(fresh.requestEvent.locals.jwtString).toBe(token);
		});

		it('deletes a refresh token Supabase refuses and sends the user to log in', async () => {
			const { requestEvent, cookies } = event('/locations', jwt(-60), 'accepts', {
				token: 'refresh-1',
				server: 'refuses'
			});

			const redirect = await redirectOf(originalHandle({ event: requestEvent, resolve: vi.fn() }));

			expect(cookies.delete).toHaveBeenCalledWith('jwt_refresh', { path: '/' });
			expect(cookies.delete).toHaveBeenCalledWith('jwt', { path: '/' });
			expect(redirect.location).toContain('expired');
		});

		it('keeps the refresh token while Supabase Auth is unreachable', async () => {
			vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			const { requestEvent, cookies } = event('/locations', jwt(-60), 'accepts', {
				token: 'refresh-1',
				server: 'unreachable'
			});

			const redirect = await redirectOf(originalHandle({ event: requestEvent, resolve: vi.fn() }));

			expect(cookies.delete).not.toHaveBeenCalledWith('jwt_refresh', expect.anything());
			expect(redirect.location).toContain('expired');
		});

		it('never refreshes for public files', async () => {
			const { requestEvent, fake } = event('/manifest.webmanifest', jwt(-60), 'accepts', {
				token: 'refresh-1',
				server: 'renews'
			});

			await originalHandle({ event: requestEvent, resolve: vi.fn(async () => html()) });

			expect(refreshRequests(fake)).toHaveLength(0);
		});
	});

	it('renders the offline page without a session, whatever the cookies hold', async () => {
		const { requestEvent, cookies, fake } = event('/offline', jwt(3600), 'accepts', {
			token: 'refresh-1',
			server: 'renews'
		});

		await originalHandle({ event: requestEvent, resolve: vi.fn(async () => html()) });

		expect(requestEvent.locals.jwtString).toBeNull();
		expect(requestEvent.locals.jwt).toBeNull();
		expect(fake.requests).toHaveLength(0);
		expect(cookies.delete).not.toHaveBeenCalled();
		expect(cookies.set).not.toHaveBeenCalled();
	});

	it('adds a UTF-8 charset to HTML responses that lack one, and leaves others alone', async () => {
		const token = jwt(3600);
		const run = async (response: Response) => {
			const { requestEvent } = event('/', token);
			return originalHandle({ event: requestEvent, resolve: async () => response });
		};

		expect((await run(html())).headers.get('content-type')).toBe('text/html; charset=utf-8');
		expect(
			(
				await run(new Response('', { headers: { 'content-type': 'text/html; charset=utf-8' } }))
			).headers.get('content-type')
		).toBe('text/html; charset=utf-8');
		expect(
			(
				await run(new Response('{}', { headers: { 'content-type': 'application/json' } }))
			).headers.get('content-type')
		).toBe('application/json');
		const bare = await run(new Response(null, { status: 204 }));
		expect(bare.headers.get('content-type')).toBeNull();
	});
});

describe('paraglideHandle', () => {
	it('localizes the request and fills the lang/dir placeholders', async () => {
		const { requestEvent } = event('/auth/login');

		const response = await paraglideHandle({
			event: requestEvent,
			resolve: async (_event, options) => {
				const page = '<html lang="%paraglide.lang%" dir="%paraglide.dir%"></html>';
				const transformed = await options?.transformPageChunk?.({ html: page, done: true });
				return html(transformed ?? page);
			}
		});

		const body = await response.text();
		expect(body).not.toContain('%paraglide');
		expect(body).toMatch(/lang="(ja|en)" dir="ltr"/);
	});
});

describe('handleError', () => {
	it('logs the error and returns a generic message', () => {
		const log = vi.spyOn(console, 'error').mockImplementation(() => {});
		const args = { event: {} as RequestEvent, message: '' };

		expect(handleError({ ...args, error: new Error('boom'), status: 500 })).toEqual({
			message: 'Internal Error'
		});
		expect(handleError({ ...args, error: new Error('missing'), status: 404 })).toEqual({
			message: 'Not Found'
		});
		expect(log).toHaveBeenCalledTimes(2);
	});
});
