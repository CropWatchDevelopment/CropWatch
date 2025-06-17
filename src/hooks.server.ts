import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import 'reflect-metadata';
import { redirect, type Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

Sentry.init({
	dsn: 'https://ba36cb18f97a466e35b23ed5ab9c916e@o4509301976530944.ingest.us.sentry.io/4509513210789888',
	tracesSampleRate: 1
});

const PUBLIC_ROUTES = [
	'/auth', // All routes under /auth/
	'/api/auth' // Only authentication-related API routes
];

// Additional check for exact /api/ route
const isExactApiRoute = (pathname: string) => pathname === '/api' || pathname === '/api/';

// Handle for Paraglide internationalization
const handleParaglide: Handle = async ({ event, resolve }) =>
	await paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

// Handle for Supabase authentication and session management
const handleSupabase: Handle = async ({ event, resolve }) => {
	// Create a Supabase client specific for server-side rendering (SSR)
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				// Store cookies to be set later instead of setting them immediately
				event.locals.supabaseCookies = cookiesToSet;
			}
		}
	});

	// Enhance session validation to include explicit debug logging
	event.locals.safeGetSession = async () => {
		try {
			console.log(`Session validation for path: ${event.url.pathname}`);
			const {
				data: { session }
			} = await event.locals.supabase.auth.getSession();
			if (!session) {
				console.warn(`No session found during validation for path: ${event.url.pathname}`);
				return { session: null, user: null };
			}

			const {
				data: { user },
				error
			} = await event.locals.supabase.auth.getUser();
			if (error) {
				console.error(
					`Error validating user session for path: ${event.url.pathname}`,
					error.message
				);
				return { session: null, user: null };
			}

			console.log(
				`Session successfully validated for path: ${event.url.pathname}, user: ${user?.email}`
			);
			return { session, user };
		} catch (err) {
			console.error(
				`Unexpected error during session validation for path: ${event.url.pathname}:`,
				err
			);
			return { session: null, user: null };
		}
	};

	// Execute session validation once and store results in locals
	const sessionData = await event.locals.safeGetSession();

	// We need to run this after Supabase handle to have access to session data
	// This will be called in the correct order in our sequence
	const pathname = event.url.pathname;

	// Check if current route requires authentication
	const isPublicRoute =
		PUBLIC_ROUTES.some((route) => pathname.startsWith(route)) || isExactApiRoute(pathname);

	if (!isPublicRoute && !sessionData.session) {
		console.log(`Redirecting unauthenticated user from protected route: ${pathname}`);
		throw redirect(302, '/auth/login');
	}

	// Store validated session and user in locals for routes to use
	event.locals.session = sessionData.session;
	event.locals.user = sessionData.user;
	console.log('Session validated and stored in locals:', sessionData.user?.email || 'Guest');

	// Resolve the response
	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});

	// After the response is generated, apply the stored cookies if they exist
	if (event.locals.supabaseCookies) {
		event.locals.supabaseCookies.forEach(({ name, value, options }) => {
			// Format sameSite value correctly
			let sameSiteValue: string | undefined;
			if (options.sameSite === true) sameSiteValue = 'Strict';
			else if (options.sameSite === false) sameSiteValue = 'None';
			else if (options.sameSite)
				sameSiteValue = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);

			// Construct cookie string
			const cookieHeader = [
				`${name}=${value}`,
				`Path=${options.path || '/'}`,
				options.httpOnly ? 'HttpOnly' : '',
				options.secure ? 'Secure' : '',
				sameSiteValue ? `SameSite=${sameSiteValue}` : '',
				options.maxAge ? `Max-Age=${options.maxAge}` : '',
				options.domain ? `Domain=${options.domain}` : ''
			]
				.filter(Boolean)
				.join('; ');

			response.headers.append('set-cookie', cookieHeader);
		});
	}

	return response;
};

// Combine the handles - Supabase first, then Paraglide
export const handle: Handle = sequence(Sentry.sentryHandle(), async ({ event, resolve }) => {
	// First apply Supabase handle (which includes route guards and may throw redirects)
	return await handleSupabase({
		event,
		resolve: async (supabaseEvent) => {
			// Then apply Paraglide for i18n (after auth logic is complete)
			return await handleParaglide({
				event: supabaseEvent,
				resolve
			});
		}
	});
});
export const handleError = Sentry.handleErrorWithSentry();
