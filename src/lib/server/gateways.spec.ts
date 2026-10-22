import { afterEach, describe, expect, it, vi } from 'vitest';
import { createFakeFetch, jsonResponse } from '$lib/testing/http';
import { createLibellusGateway } from './libellus';
import { createSupabaseAuthGateway } from './supabase';

const { createClient, auth } = vi.hoisted(() => {
	const auth = {
		verifyOtp: vi.fn(async () => ({ data: { session: null }, error: null })),
		resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
		signUp: vi.fn(async () => ({ data: {}, error: null }))
	};
	return { auth, createClient: vi.fn(() => ({ auth })) };
});

// The Supabase SDK is the external boundary here: mocked, never contacted
// (supabase.spec.ts runs the real SDK over a fake network).
vi.mock('@supabase/supabase-js', () => ({ createClient, isAuthRetryableFetchError: () => false }));

afterEach(() => {
	vi.clearAllMocks();
	vi.unstubAllGlobals();
});

const SUPABASE = { url: 'https://project.supabase.test', anonKey: 'anon-key' };

describe('createSupabaseAuthGateway', () => {
	it('creates an anon, session-less client per call and delegates to its auth API', async () => {
		const gateway = createSupabaseAuthGateway(SUPABASE);

		await gateway.verifyOtp({ type: 'recovery', token_hash: 'hash' });
		await gateway.resetPasswordForEmail('a@b.c', { redirectTo: 'https://app.test/x' });
		await gateway.signUp({ email: 'a@b.c', password: 'secret' });

		expect(createClient).toHaveBeenCalledTimes(3);
		expect(createClient).toHaveBeenCalledWith('https://project.supabase.test', 'anon-key', {
			auth: { autoRefreshToken: false, persistSession: false },
			global: { fetch: expect.any(Function) }
		});
		expect(auth.verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'hash' });
		expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.c', {
			redirectTo: 'https://app.test/x'
		});
		expect(auth.signUp).toHaveBeenCalledWith({ email: 'a@b.c', password: 'secret' });
	});

	it('throws when the Supabase env is missing, at call time', async () => {
		const gateway = createSupabaseAuthGateway({ url: '', anonKey: 'anon-key' });

		expect(() => gateway.signUp({ email: 'a@b.c', password: 'x' })).toThrow(
			'Supabase public environment variables are missing.'
		);
		expect(() =>
			createSupabaseAuthGateway({ url: SUPABASE.url, anonKey: '' }).verifyOtp({
				type: 'recovery',
				token_hash: 'h'
			})
		).toThrow('Supabase public environment variables are missing.');
	});

	it('updates the password through the Auth REST API with the recovery token', async () => {
		const fake = createFakeFetch(() => jsonResponse({ id: 'user-1' }));

		const response = await createSupabaseAuthGateway(
			SUPABASE,
			fake.fetch
		).updatePasswordWithRecoveryToken('recovery-token', 'new-password');

		expect(response.ok).toBe(true);
		const request = fake.onlyRequest();
		expect(request.url).toBe('https://project.supabase.test/auth/v1/user');
		expect(request.method).toBe('PUT');
		expect(request.body).toEqual({ password: 'new-password' });
		expect(request.headers.get('authorization')).toBe('Bearer recovery-token');
		expect(request.headers.get('apikey')).toBe('anon-key');
		expect(request.headers.get('content-type')).toBe('application/json');
	});

	it('uses the global fetch for the REST call by default', async () => {
		const fake = createFakeFetch(() => jsonResponse({}));
		vi.stubGlobal('fetch', fake.fetch);

		await createSupabaseAuthGateway(SUPABASE).updatePasswordWithRecoveryToken('t', 'p');

		expect(fake.requests).toHaveLength(1);
	});
});

describe('createLibellusGateway', () => {
	it('reports a missing token before a missing base URL', () => {
		const fetch = createFakeFetch().fetch;

		expect(createLibellusGateway({ baseUrl: '', apiToken: '' }, fetch).configurationProblem).toBe(
			'missing-api-token'
		);
		expect(createLibellusGateway({ baseUrl: '', apiToken: 't' }, fetch).configurationProblem).toBe(
			'missing-base-url'
		);
		expect(
			createLibellusGateway({ baseUrl: 'https://libellus.test', apiToken: 't' }, fetch)
				.configurationProblem
		).toBeNull();
	});

	it('requests the PDF certificate under the base URL with the API token', async () => {
		const fake = createFakeFetch(() => new Response('%PDF'));
		const gateway = createLibellusGateway(
			{ baseUrl: 'https://libellus.test/api', apiToken: 'token-1' },
			fake.fetch
		);

		await gateway.fetchSensorCertificate('SHT43', 'SN/1 2', 'calibration');
		await gateway.fetchSensorCertificate('SHT43', 'SN3');

		expect(fake.requests.map((r) => r.url)).toEqual([
			'https://libellus.test/api/SHT43/sensors/SN%2F1%202/certificate?format=application%2Fpdf&type=calibration',
			'https://libellus.test/api/SHT43/sensors/SN3/certificate?format=application%2Fpdf'
		]);
		expect(fake.requests[0].method).toBe('GET');
		expect(fake.requests[0].headers.get('authorization')).toBe('Token token-1');
	});

	it('keeps a base URL that already ends with a slash', async () => {
		const fake = createFakeFetch(() => new Response('%PDF'));

		await createLibellusGateway(
			{ baseUrl: 'https://libellus.test/api/', apiToken: 't' },
			fake.fetch
		).fetchSensorCertificate('SHT43', 'SN3');

		expect(fake.onlyRequest().url).toBe(
			'https://libellus.test/api/SHT43/sensors/SN3/certificate?format=application%2Fpdf'
		);
	});
});
