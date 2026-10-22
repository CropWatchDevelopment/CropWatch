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

const isAuthRequest = (url: string) => new URL(url).pathname.startsWith('/auth/v1/');

function event(path: string, token?: string, auth: AuthServer = 'accepts') {
	const fake = createFakeFetch((request) =>
		isAuthRequest(request.url) ? authAnswer(auth) : jsonResponse({ online: 0, offline: 0 })
	);
	const cookies = {
		get: vi.fn((name: string) => (name === 'jwt' ? token : undefined)),
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
