import { sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';
import type { IJWT } from '$lib/interfaces/jwt.interface';
import type { HandleFetch } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { jwtDecode } from 'jwt-decode';
import { env as publicEnv } from '$env/dynamic/public';

const PUBLIC_PATHS = new Set(['/manifest.webmanifest', '/offline', '/service-worker.js']);
const PUBLIC_API_BASE_URL = publicEnv.PUBLIC_API_BASE_URL ?? '';

export const originalHandle = async ({ event, resolve }) => {
	const token = event.cookies.get('jwt');

	checkAuthToken(token ?? '', event);

	return await resolve(event);
};

const checkAuthToken = (token: string, event: any) => {
	const authRoute = event.url.pathname.startsWith('/auth');
	const publicRoute = PUBLIC_PATHS.has(event.url.pathname);
	const bypassAuth = authRoute || publicRoute;

	if (token) {
		try {
			const decodedJWT: IJWT = jwtDecode(token) as IJWT;

			event.locals.jwt = decodedJWT; // looking good, add to locals
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
						`/auth/login?expired=true&redirect=${encodeURIComponent(event.url.pathname)}`
					);
				}
			}

			// Token is valid and not expired, proceed as normal
			return true;
		} catch (error) {
			if (!bypassAuth) {
				event.locals.jwt = null;
				event.locals.jwtString = null;

				throw redirect(303, `/auth/login?redirect=${encodeURIComponent(event.url.pathname)}`);
			}
		}
	} else {
		if (!bypassAuth) {
			console.log('No JWT token found, redirecting to login');
			event.locals.jwt = null;
			event.locals.jwtString = null;

			throw redirect(303, `/auth/login?redirect=${encodeURIComponent(event.url.pathname)}`);
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

const handleParaglide = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle = sequence(originalHandle, handleParaglide);
// looking good, add to locals
// Token is valid and not expired, proceed as normal
