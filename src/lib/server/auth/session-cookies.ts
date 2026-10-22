import type { Cookies } from '@sveltejs/kit';

/** The Supabase access token every request is authenticated with. */
export const SESSION_COOKIE = 'jwt';

/** The Supabase refresh token: renews the access token when it runs out. */
export const REFRESH_COOKIE = 'jwt_refresh';

/**
 * How long a browser stays signed in without being used. Every refresh sets the
 * cookie again, so a session that is used keeps going; one left alone this long
 * has to sign in again.
 */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface IssuedSession {
	accessToken: string;
	/** Absent from an API that predates refresh tokens: the session then ends with the access token. */
	refreshToken?: string | null;
	expiresAt: Date;
}

/**
 * Stores a newly issued session in httpOnly cookies. The access token cookie
 * lives exactly as long as the token. Returns false, and stores nothing, when
 * the session has already expired.
 */
export function setSessionCookies(
	cookies: Cookies,
	{ accessToken, refreshToken, expiresAt }: IssuedSession,
	secure: boolean
): boolean {
	const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
	if (!Number.isFinite(maxAge) || maxAge <= 0) return false;

	const options = { path: '/', httpOnly: true, secure, sameSite: 'lax' } as const;
	cookies.set(SESSION_COOKIE, accessToken, { ...options, maxAge });
	if (refreshToken) {
		cookies.set(REFRESH_COOKIE, refreshToken, {
			...options,
			maxAge: REFRESH_COOKIE_MAX_AGE_SECONDS
		});
	}
	return true;
}
