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
