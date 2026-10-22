import { sequence } from '@sveltejs/kit/hooks';
import { readPublicConfig } from '$lib/config/public';
import { readServerConfig } from '$lib/server/config';
import { createServerServices } from '$lib/server/services';
import { decodeJwtPayload } from '$lib/server/auth/jwt';
import {
	REFRESH_COOKIE,
	SESSION_COOKIE,
	setSessionCookies
} from '$lib/server/auth/session-cookies';
import { SERVER_REFRESH_WINDOW_SECONDS } from '$lib/auth/session-renewal';
import { buildLoginPath, type LoginReason } from '$lib/utils/auth-redirect';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle, HandleServerError, RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const PUBLIC_PATHS = new Set(['/manifest.webmanifest', '/service-worker.js', '/push-sw.js']);

// The service worker caches the offline page and shows it to whoever is offline
// later, so it is always rendered without a session.
const SESSIONLESS_PATHS = new Set(['/offline', '/offline/']);

function getAuthRedirectTarget(event: RequestEvent): string {
	return `${event.url.pathname}${event.url.search}`;
}

export const originalHandle: Handle = async ({ event, resolve }) => {
	// The request's composition root: every load, action and endpoint reads and
	// writes data through these, authenticated as this request's session.
	event.locals.config = { public: readPublicConfig(), server: readServerConfig() };
	event.locals.services = createServerServices({
		fetch: event.fetch,
		authToken: () => event.locals.jwtString,
		config: event.locals.config.public,
		serverConfig: event.locals.config.server
	});

	await authenticate(event);

	const response = await resolve(event);

	return ensureHtmlCharset(response);
};

const ensureHtmlCharset = (response: Response): Response => {
	const contentType = response.headers.get('content-type');

	if (!contentType) {
		return response;
	}

	const isHtml = contentType.toLowerCase().includes('text/html');
	const hasCharset = contentType.toLowerCase().includes('charset=');

	if (!isHtml || hasCharset) {
		return response;
	}

	const headers = new Headers(response.headers);
	headers.set('content-type', `${contentType}; charset=utf-8`);

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers
	});
};

/**
 * Establishes the request's session from the `jwt` cookie before any load,
 * action or endpoint runs (the SvelteKit `handle` hook is the one place every
 * request passes). A session about to run out is first renewed with its
 * refresh token (`refreshIfDue`). The token is verified with Supabase Auth — its
 * claims are never trusted just because they decode — and protected routes
 * redirect to login without a valid session.
 */
async function authenticate(event: RequestEvent): Promise<void> {
	const { pathname } = event.url;
	const bypassAuth = pathname.startsWith('/auth') || PUBLIC_PATHS.has(pathname);

	event.locals.jwt = null;
	event.locals.jwtString = null;

	if (SESSIONLESS_PATHS.has(pathname)) return;

	let token = event.cookies.get(SESSION_COOKIE) ?? '';
	// Static files and the manifest need no session, and refreshing for them
	// would only rotate the refresh token for nothing.
	if (!PUBLIC_PATHS.has(pathname)) token = await refreshIfDue(event, token);

	const rejectSession = (reason: LoginReason) => {
		if (token) event.cookies.delete(SESSION_COOKIE, { path: '/' });
		if (!bypassAuth) {
			redirect(303, buildLoginPath({ redirectTo: getAuthRedirectTarget(event), reason }));
		}
	};

	if (!token) return rejectSession('auth-required');

	const payload = decodeJwtPayload(token);
	if (!payload) return rejectSession('auth-required');
	if (payload.exp < Math.floor(Date.now() / 1000)) return rejectSession('expired');

	const verification = await event.locals.services.supabaseAuth.verifyAccessToken(token);
	if (verification.status === 'invalid') return rejectSession('auth-required');

	// `unavailable`: Supabase Auth could not be reached. Keep the session on its
	// decoded claims rather than signing everyone out during an Auth outage — the
	// CropWatch API still verifies the token on every data request.
	event.locals.jwt = verification.status === 'valid' ? verification.claims : payload;
	event.locals.jwtString = token;
}

/**
 * Renews the session with its refresh token when the access token is missing
 * (its cookie expires with it) or about to run out. Returns the token to
 * authenticate the request with: the new one, or the old one when there is
 * nothing to refresh or the refresh failed. A refresh token Supabase refuses
 * (used, revoked by a sign-out) is deleted.
 */
async function refreshIfDue(event: RequestEvent, token: string): Promise<string> {
	const refreshToken = event.cookies.get(REFRESH_COOKIE);
	if (!refreshToken) return token;

	const exp = token ? decodeJwtPayload(token)?.exp : undefined;
	if (exp !== undefined && exp - Math.floor(Date.now() / 1000) > SERVER_REFRESH_WINDOW_SECONDS) {
		return token;
	}

	const refreshed = await event.locals.services.supabaseAuth.refreshSession(refreshToken);
	if (refreshed.status === 'refreshed') {
		const secure = event.url.protocol === 'https:';
		if (setSessionCookies(event.cookies, refreshed, secure)) return refreshed.accessToken;
	} else if (refreshed.status === 'invalid') {
		event.cookies.delete(REFRESH_COOKIE, { path: '/' });
	}
	return token;
}

export const paraglideHandle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle = sequence(paraglideHandle, originalHandle);

export const handleError: HandleServerError = ({ error, status }) => {
	console.error('[CropWatch] Unexpected server error:', error);

	return {
		message: status === 404 ? 'Not Found' : 'Internal Error'
	};
};
