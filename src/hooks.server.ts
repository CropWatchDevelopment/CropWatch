import { sequence } from '@sveltejs/kit/hooks';
import { readPublicConfig } from '$lib/config/public';
import { readServerConfig } from '$lib/server/config';
import { createServerServices } from '$lib/server/services';
import { decodeJwtPayload } from '$lib/server/auth/jwt';
import { buildLoginPath, type LoginReason } from '$lib/utils/auth-redirect';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { Handle, HandleServerError, RequestEvent } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

const PUBLIC_PATHS = new Set([
	'/manifest.webmanifest',
	'/offline',
	'/offline/',
	'/service-worker.js',
	'/push-sw.js'
]);

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
 * request passes). The token is verified with Supabase Auth — its claims are
 * never trusted just because they decode — and protected routes redirect to
 * login without a valid session.
 */
async function authenticate(event: RequestEvent): Promise<void> {
	const bypassAuth = event.url.pathname.startsWith('/auth') || PUBLIC_PATHS.has(event.url.pathname);
	const token = event.cookies.get('jwt') ?? '';

	event.locals.jwt = null;
	event.locals.jwtString = null;

	const rejectSession = (reason: LoginReason) => {
		if (token) event.cookies.delete('jwt', { path: '/' });
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
