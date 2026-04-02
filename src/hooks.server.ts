import { sequence } from '@sveltejs/kit/hooks';
import { buildLoginPath } from '$lib/utils/auth-redirect';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { Handle, HandleFetch, RequestEvent } from '@sveltejs/kit';
import { isRedirect, redirect } from '@sveltejs/kit';
import { jwtDecode } from 'jwt-decode';
import { env as publicEnv } from '$env/dynamic/public';

const PUBLIC_PATHS = new Set([
	'/manifest.webmanifest',
	'/offline',
	'/offline/',
	'/service-worker.js'
]);
const PUBLIC_API_BASE_URL = publicEnv.PUBLIC_API_BASE_URL ?? '';

function getAuthRedirectTarget(event: RequestEvent): string {
	return `${event.url.pathname}${event.url.search}`;
}

export const originalHandle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('jwt');

	checkAuthToken(token ?? '', event);

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

const checkAuthToken = (token: string, event: RequestEvent) => {
	const authRoute = event.url.pathname.startsWith('/auth');
	const publicRoute = PUBLIC_PATHS.has(event.url.pathname);
	const bypassAuth = authRoute || publicRoute;

	if (token) {
		let decodedJWT: IJWT;

		try {
			decodedJWT = jwtDecode(token) as IJWT;
		} catch (error) {
			if (isRedirect(error)) {
				throw error;
			}

			if (!bypassAuth) {
				event.locals.jwt = null;
				event.locals.jwtString = null;

				throw redirect(
					303,
					buildLoginPath({
						redirectTo: getAuthRedirectTarget(event),
						reason: 'auth-required'
					})
				);
			}

			return false;
		}

		event.locals.jwt = decodedJWT;
		event.locals.jwtString = token;

		const now = Math.floor(Date.now() / 1000);

		if (decodedJWT.exp < now) {
			console.log('JWT token expired, redirecting to login');
			event.cookies.delete('jwt', { path: '/' });
			event.locals.jwt = null;
			event.locals.jwtString = null;

			if (!bypassAuth) {
				throw redirect(
					303,
					buildLoginPath({
						redirectTo: getAuthRedirectTarget(event),
						reason: 'expired'
					})
				);
			}

			return false;
		}

		return true;
	} else {
		if (!bypassAuth) {
			console.log('No JWT token found, redirecting to login');
			event.locals.jwt = null;
			event.locals.jwtString = null;

			throw redirect(
				303,
				buildLoginPath({
					redirectTo: getAuthRedirectTarget(event),
					reason: 'auth-required'
				})
			);
		}
	}

	return false;
};

const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
	if (PUBLIC_API_BASE_URL && request.url.startsWith(PUBLIC_API_BASE_URL)) {
		const token = event.cookies.get('jwt');

		checkAuthToken(token ?? '', event);

		if (token) {
			request.headers.set('Authorization', `Bearer ${token}`);
		}
	}

	return fetch(request);
};

const paraglideHandle: Handle = ({ event, resolve }) =>
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
