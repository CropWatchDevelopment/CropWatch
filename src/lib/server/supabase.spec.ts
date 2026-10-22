import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeFetch, jsonResponse, type FakeResponder } from '$lib/testing/http';
import { createSupabaseAuthGateway } from './supabase';

// The real Supabase SDK over a fake network: proves the actual verification.
const SUPABASE = { url: 'https://project.supabase.test', anonKey: 'anon-key' };
const JWKS_URL = `${SUPABASE.url}/auth/v1/.well-known/jwks.json`;
const USER_URL = `${SUPABASE.url}/auth/v1/user`;

const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
const nowSeconds = () => Math.floor(Date.now() / 1000);
const claims = (overrides: Record<string, unknown> = {}) => ({
	sub: 'user-1',
	email: 'operator@cropwatch.test',
	role: 'authenticated',
	session_id: 'session-1',
	exp: nowSeconds() + 3600,
	...overrides
});

let kidCounter = 0;

/** A fresh ES256 signing key, as the project's JWKS would publish it. */
async function signingKey() {
	const kid = `test-key-${++kidCounter}`;
	const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify'
	]);
	const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid, alg: 'ES256' };
	const sign = async (payload: unknown) => {
		const unsigned = `${encode({ alg: 'ES256', typ: 'JWT', kid })}.${encode(payload)}`;
		const signature = await crypto.subtle.sign(
			{ name: 'ECDSA', hash: 'SHA-256' },
			pair.privateKey,
			new TextEncoder().encode(unsigned)
		);
		return `${unsigned}.${Buffer.from(signature).toString('base64url')}`;
	};
	return { kid, jwk, sign };
}

function gatewayOver(responder: FakeResponder) {
	const fake = createFakeFetch(responder);
	return { gateway: createSupabaseAuthGateway(SUPABASE, fake.fetch), fake };
}

/** The project's Auth server: it publishes `keys` and refuses any token it did not sign. */
const authServer =
	(keys: JsonWebKey[]): FakeResponder =>
	(request) =>
		request.url === JWKS_URL
			? jsonResponse({ keys })
			: jsonResponse({ code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' }, { status: 403 });

afterEach(() => {
	vi.restoreAllMocks();
});

describe('verifyAccessToken (asymmetric signing keys)', () => {
	it('verifies the signature against the project JWKS and returns the claims', async () => {
		const key = await signingKey();
		const token = await key.sign(claims());
		const { gateway, fake } = gatewayOver(authServer([key.jwk]));

		const result = await gateway.verifyAccessToken(token);

		expect(result).toEqual({ status: 'valid', claims: expect.objectContaining({ sub: 'user-1' }) });
		expect(fake.requests.map((request) => request.url)).toEqual([JWKS_URL]);
	});

	it('rejects a token whose payload was changed after signing (forged claims)', async () => {
		const key = await signingKey();
		const [header, , signature] = (await key.sign(claims())).split('.');
		const forged = [header, encode(claims({ sub: 'someone-else' })), signature].join('.');
		const { gateway } = gatewayOver(authServer([key.jwk]));

		await expect(gateway.verifyAccessToken(forged)).resolves.toEqual({ status: 'invalid' });
	});

	it('rejects a token signed by a key the project does not publish', async () => {
		const published = await signingKey();
		const attacker = await signingKey();
		const token = await attacker.sign(claims());
		const { gateway, fake } = gatewayOver(authServer([published.jwk]));

		await expect(gateway.verifyAccessToken(token)).resolves.toEqual({ status: 'invalid' });
		// An unknown key id falls back to asking the Auth server, which refuses it.
		expect(fake.requests.map((request) => request.url)).toEqual([JWKS_URL, USER_URL]);
	});

	it('rejects an expired token without asking anyone', async () => {
		const key = await signingKey();
		const token = await key.sign(claims({ exp: nowSeconds() - 60 }));
		const { gateway, fake } = gatewayOver(authServer([key.jwk]));

		await expect(gateway.verifyAccessToken(token)).resolves.toEqual({ status: 'invalid' });
		expect(fake.requests).toHaveLength(0);
	});
});

describe('verifyAccessToken (legacy symmetric secret)', () => {
	const hs256 = (payload = claims()) =>
		[encode({ alg: 'HS256', typ: 'JWT' }), encode(payload), encode('hmac-signature')].join('.');

	it('asks the Auth server (GET /auth/v1/user) and trusts the claims it accepts', async () => {
		const token = hs256();
		const { gateway, fake } = gatewayOver(() => jsonResponse({ id: 'user-1' }));

		await expect(gateway.verifyAccessToken(token)).resolves.toEqual({
			status: 'valid',
			claims: expect.objectContaining({ sub: 'user-1' })
		});
		const request = fake.onlyRequest();
		expect(request.url).toBe(USER_URL);
		expect(request.method).toBe('GET');
		expect(request.headers.get('authorization')).toBe(`Bearer ${token}`);
		expect(request.headers.get('apikey')).toBe('anon-key');
	});

	it('rejects a token the Auth server refuses (forged, revoked session)', async () => {
		const { gateway } = gatewayOver(() =>
			jsonResponse({ code: 403, error_code: 'bad_jwt', msg: 'invalid JWT' }, { status: 403 })
		);

		await expect(gateway.verifyAccessToken(hs256())).resolves.toEqual({ status: 'invalid' });
	});

	it('reports "unavailable" (not "invalid") when the Auth server cannot be reached', async () => {
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const { gateway } = gatewayOver(() => Promise.reject(new TypeError('fetch failed')));

		await expect(gateway.verifyAccessToken(hs256())).resolves.toEqual({ status: 'unavailable' });
	});
});

describe('verifyAccessToken (configuration)', () => {
	it('reports "unavailable" when Supabase is not configured', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const gateway = createSupabaseAuthGateway({ url: '', anonKey: '' });

		await expect(gateway.verifyAccessToken('a.b.c')).resolves.toEqual({ status: 'unavailable' });
		expect(warn).toHaveBeenCalled();
	});
});

describe('signOut', () => {
	it("ends this session only (POST /auth/v1/logout?scope=local with the user's token)", async () => {
		const { gateway, fake } = gatewayOver(() => new Response(null, { status: 204 }));

		await gateway.signOut('access-token');

		const request = fake.onlyRequest();
		expect(request.url).toBe(`${SUPABASE.url}/auth/v1/logout?scope=local`);
		expect(request.method).toBe('POST');
		expect(request.headers.get('authorization')).toBe('Bearer access-token');
	});

	it('never throws: a refused or failed sign-out is logged', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const refused = gatewayOver(() =>
			jsonResponse({ code: 401, msg: 'invalid JWT' }, { status: 401 })
		);
		const offline = gatewayOver(() => Promise.reject(new TypeError('fetch failed')));

		await expect(refused.gateway.signOut('access-token')).resolves.toBeUndefined();
		await expect(offline.gateway.signOut('access-token')).resolves.toBeUndefined();
		expect(warn).toHaveBeenCalledTimes(2);
	});
});

describe('refreshSession', () => {
	const TOKEN_URL = `${SUPABASE.url}/auth/v1/token?grant_type=refresh_token`;
	const session = (overrides: Record<string, unknown> = {}) => ({
		access_token: 'access-2',
		refresh_token: 'refresh-2',
		token_type: 'bearer',
		expires_in: 3600,
		expires_at: nowSeconds() + 3600,
		...overrides
	});

	it('trades the refresh token for a new session in one request', async () => {
		const answer = session();
		const { gateway, fake } = gatewayOver(() => jsonResponse(answer));

		const result = await gateway.refreshSession('refresh-1');

		expect(result).toEqual({
			status: 'refreshed',
			accessToken: 'access-2',
			refreshToken: 'refresh-2',
			expiresAt: new Date(answer.expires_at * 1000)
		});
		const request = fake.onlyRequest();
		expect(request.url).toBe(TOKEN_URL);
		expect(request.method).toBe('POST');
		expect(request.headers.get('apikey')).toBe(SUPABASE.anonKey);
		expect(request.body).toEqual({ refresh_token: 'refresh-1' });
		expect(request.signal).toBeInstanceOf(AbortSignal);
	});

	it('works out the expiry from expires_in when expires_at is missing', async () => {
		const { gateway } = gatewayOver(() => jsonResponse(session({ expires_at: undefined })));

		const result = await gateway.refreshSession('refresh-1');

		expect(result).toMatchObject({ status: 'refreshed' });
		const expiresAt = (result as { expiresAt: Date }).expiresAt.getTime();
		expect(Math.abs(expiresAt - (Date.now() + 3_600_000))).toBeLessThan(2_000);
	});

	it.each([400, 401, 403])('reports a refused refresh token (%i) as invalid', async (status) => {
		const { gateway } = gatewayOver(() =>
			jsonResponse(
				{ code: status, error_code: 'refresh_token_already_used', msg: 'Invalid Refresh Token' },
				{ status }
			)
		);

		await expect(gateway.refreshSession('refresh-1')).resolves.toEqual({ status: 'invalid' });
	});

	it.each([
		['the network fails', () => Promise.reject(new TypeError('fetch failed'))],
		['Auth is down', () => jsonResponse({ msg: 'unavailable' }, { status: 503 })],
		['Auth rate-limits', () => jsonResponse({ msg: 'slow down' }, { status: 429 })],
		['the answer is not JSON', () => new Response('<html>', { status: 200 })],
		['the answer has no session', () => jsonResponse(session({ refresh_token: undefined }))],
		[
			'the answer has no expiry',
			() => jsonResponse(session({ expires_at: undefined, expires_in: undefined }))
		]
	])(
		'reports the session as unavailable when %s (the token may still be good)',
		async (_, answer) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
			const { gateway } = gatewayOver(answer);

			await expect(gateway.refreshSession('refresh-1')).resolves.toEqual({ status: 'unavailable' });
			expect(warn).toHaveBeenCalledTimes(1);
		}
	);
});
