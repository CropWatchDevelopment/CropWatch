import {
	createClient,
	isAuthRetryableFetchError,
	type SupabaseClient
} from '@supabase/supabase-js';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { SupabaseConfig } from './config';

type SupabaseAuth = SupabaseClient['auth'];

/** The outcome of checking a session token with Supabase Auth. */
export type AccessTokenVerification =
	| { status: 'valid'; claims: IJWT }
	/** Forged, tampered, expired, revoked or not a Supabase token. */
	| { status: 'invalid' }
	/** It could not be checked right now (Auth unreachable) — says nothing about the token. */
	| { status: 'unavailable' };

/** The Supabase Auth calls the server makes (`locals.services.supabaseAuth`). */
export interface SupabaseAuthGateway {
	verifyOtp(
		params: Parameters<SupabaseAuth['verifyOtp']>[0]
	): ReturnType<SupabaseAuth['verifyOtp']>;
	resetPasswordForEmail(
		...args: Parameters<SupabaseAuth['resetPasswordForEmail']>
	): ReturnType<SupabaseAuth['resetPasswordForEmail']>;
	signUp(credentials: Parameters<SupabaseAuth['signUp']>[0]): ReturnType<SupabaseAuth['signUp']>;
	/**
	 * Sets a new password with a recovery access token, through the Auth REST
	 * API (`PUT /auth/v1/user`). Resolves with the raw response.
	 */
	updatePasswordWithRecoveryToken(accessToken: string, password: string): Promise<Response>;
	/**
	 * Verifies a session access token with `auth.getClaims()`: its signature
	 * against the project's signing keys (a cached JWKS) or — for a project on
	 * the legacy symmetric JWT secret — by asking the Auth server.
	 */
	verifyAccessToken(accessToken: string): Promise<AccessTokenVerification>;
	/**
	 * Ends this session in Supabase Auth (`scope: 'local'`: other devices stay
	 * signed in). Best effort: a failure is logged, never thrown.
	 */
	signOut(accessToken: string): Promise<void>;
}

/**
 * A server-side Supabase client using the public anon key: it is subject to
 * RLS and bypasses no security policy. A fresh client per call, never a
 * persisted session.
 */
function createSupabaseClient(
	{ url, anonKey }: SupabaseConfig,
	fetchFn: typeof fetch
): SupabaseClient {
	if (!url || !anonKey) {
		throw new Error('Supabase public environment variables are missing.');
	}

	return createClient(url, anonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		},
		global: { fetch: fetchFn }
	});
}

export function createSupabaseAuthGateway(
	config: SupabaseConfig,
	fetchFn: typeof fetch = (input, init) => globalThis.fetch(input, init)
): SupabaseAuthGateway {
	const auth = () => createSupabaseClient(config, fetchFn).auth;

	return {
		verifyOtp: (params) => auth().verifyOtp(params),
		resetPasswordForEmail: (...args) => auth().resetPasswordForEmail(...args),
		signUp: (credentials) => auth().signUp(credentials),
		updatePasswordWithRecoveryToken: (accessToken, password) =>
			fetchFn(`${config.url}/auth/v1/user`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${accessToken}`,
					apikey: config.anonKey
				},
				body: JSON.stringify({ password })
			}),
		verifyAccessToken: async (accessToken) => {
			try {
				const { data, error } = await auth().getClaims(accessToken);
				if (data?.claims) return { status: 'valid', claims: data.claims as unknown as IJWT };
				if (isAuthRetryableFetchError(error)) {
					console.warn('Supabase Auth unreachable; session token not verified:', error.message);
					return { status: 'unavailable' };
				}
				return { status: 'invalid' };
			} catch (error) {
				console.warn('Session token verification failed to run:', error);
				return { status: 'unavailable' };
			}
		},
		signOut: async (accessToken) => {
			try {
				const { error } = await auth().admin.signOut(accessToken, 'local');
				if (error) console.warn('Supabase sign-out failed:', error.message);
			} catch (error) {
				console.warn('Supabase sign-out failed:', error);
			}
		}
	};
}
