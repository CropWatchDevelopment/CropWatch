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

/** The outcome of renewing a session with its refresh token. */
export type SessionRefresh =
	| { status: 'refreshed'; accessToken: string; refreshToken: string; expiresAt: Date }
	/** Already used, revoked (signed out) or unknown: the person has to sign in again. */
	| { status: 'invalid' }
	/** Auth could not be reached — the refresh token may still be good. */
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
	 * Trades a refresh token for a new session. Supabase rotates refresh tokens,
	 * so the one passed in stops working (after a short reuse window).
	 */
	refreshSession(refreshToken: string): Promise<SessionRefresh>;
	/**
	 * Ends this session in Supabase Auth (`scope: 'local'`: other devices stay
	 * signed in). Best effort: a failure is logged, never thrown.
	 */
	signOut(accessToken: string): Promise<void>;
}

/** A refresh blocks the request it runs in; give up on a slow Auth server after this. */
const REFRESH_TIMEOUT_MS = 5_000;

/** The parts of the Auth server's `POST /token?grant_type=refresh_token` answer used here. */
type RefreshedSessionBody = {
	access_token?: string;
	refresh_token?: string;
	expires_at?: number;
	expires_in?: number;
};

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
		// The token endpoint directly, not auth.refreshSession(): the SDK retries an
		// unreachable Auth server with backoff for up to 30 s, and this runs inside
		// the request hook.
		refreshSession: async (refreshToken) => {
			let response: Response;
			try {
				response = await fetchFn(`${config.url}/auth/v1/token?grant_type=refresh_token`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', apikey: config.anonKey },
					body: JSON.stringify({ refresh_token: refreshToken }),
					signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS)
				});
			} catch (error) {
				console.warn('Supabase Auth unreachable; session not refreshed:', error);
				return { status: 'unavailable' };
			}

			if (response.status === 429 || response.status >= 500) {
				console.warn(`Supabase Auth answered ${response.status}; session not refreshed`);
				return { status: 'unavailable' };
			}
			// 400/401/403: used, revoked or unknown refresh token.
			if (!response.ok) return { status: 'invalid' };

			const session = (await response.json().catch(() => null)) as RefreshedSessionBody | null;
			const expiresAt =
				typeof session?.expires_at === 'number'
					? session.expires_at
					: Math.floor(Date.now() / 1000) + Number(session?.expires_in);
			if (!session?.access_token || !session.refresh_token || !Number.isFinite(expiresAt)) {
				console.warn('Supabase Auth answered a refresh without a session');
				return { status: 'unavailable' };
			}
			return {
				status: 'refreshed',
				accessToken: session.access_token,
				refreshToken: session.refresh_token,
				expiresAt: new Date(expiresAt * 1000)
			};
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
