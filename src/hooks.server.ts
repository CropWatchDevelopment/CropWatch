import 'reflect-metadata';
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

// Handle for Paraglide internationalization
const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
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
			},
		},
	});

	// Enhance session validation to include explicit debug logging
	event.locals.safeGetSession = async () => {
		try {
			console.log(`Session validation for path: ${event.url.pathname}`);
			const {
				data: { session },
			} = await event.locals.supabase.auth.getSession();
			if (!session) {
				console.warn(`No session found during validation for path: ${event.url.pathname}`);
				return { session: null, user: null };
			}

			const {
				data: { user },
				error,
			} = await event.locals.supabase.auth.getUser();
			if (error) {
				console.error(`Error validating user session for path: ${event.url.pathname}`, error.message);
				return { session: null, user: null };
			}

			console.log(`Session successfully validated for path: ${event.url.pathname}, user: ${user?.email}`);
			return { session, user };
		} catch (err) {
			console.error(`Unexpected error during session validation for path: ${event.url.pathname}:`, err);
			return { session: null, user: null };
		}
	};

	// Execute session validation once and store results in locals
	const sessionData = await event.locals.safeGetSession();

	// Store validated session and user in locals for routes to use
	event.locals.session = sessionData.session;
	event.locals.user = sessionData.user;
	console.log('Session validated and stored in locals:', sessionData.user?.email || 'Guest');

	// Resolve the response
	const response = await resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version'
		},
	});

	// After the response is generated, apply the stored cookies if they exist
	if (event.locals.supabaseCookies) {
		event.locals.supabaseCookies.forEach(({ name, value, options }) => {
			// Format sameSite value correctly
			let sameSiteValue: string | undefined;
			if (options.sameSite === true) sameSiteValue = 'Strict';
			else if (options.sameSite === false) sameSiteValue = 'None';
			else if (options.sameSite) sameSiteValue = options.sameSite.charAt(0).toUpperCase() + options.sameSite.slice(1);

			// Construct cookie string
			const cookieHeader = [
				`${name}=${value}`,
				`Path=${options.path || '/'}`,
				options.httpOnly ? 'HttpOnly' : '',
				options.secure ? 'Secure' : '',
				sameSiteValue ? `SameSite=${sameSiteValue}` : '',
				options.maxAge ? `Max-Age=${options.maxAge}` : '',
				options.domain ? `Domain=${options.domain}` : ''
			].filter(Boolean).join('; ');

			response.headers.append('set-cookie', cookieHeader);
		});
	}

	return response;
}

// Combine the handles - Paraglide first, then Supabase
export const handle: Handle = async ({ event, resolve }) => {
	// First apply Paraglide for i18n
	return handleParaglide({
		event,
		resolve: async (paraglideEvent) => {
			// Then apply Supabase handle with the same event
			return handleSupabase({
				event: paraglideEvent,
				resolve
			});
		}
	});
}
