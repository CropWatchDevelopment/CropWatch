import { error, redirect, type Handle } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/sveltekit';

Sentry.init({
	dsn: 'https://ba36cb18f97a466e35b23ed5ab9c916e@o4509301976530944.ingest.us.sentry.io/4509513210789888',
	// Adds request headers and IP for users, for more info visit:
	// https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
	sendDefaultPii: true
});

const PUBLIC_ROUTES = [
	'/offline.html',
	'/auth', // All routes under /auth/
	'/api/auth', // Only authentication-related API routes
	'/api/webhook', // Webhook endpoints (authenticated via webhook signatures)
	'/static', // All static assets
	'/static/icons',
	'/static/screenshots'
];

const myErrorHandler = ({ error, event }) => {
	console.error('An error occurred on the server side:', error, event);
};
export const handleError = Sentry.handleErrorWithSentry(myErrorHandler);

// Additional check for exact /api/ route
const isExactApiRoute = (pathname: string) => pathname === '/api' || pathname === '/api/';

// Handle for CORS
const handleCORS: Handle = async ({ event, resolve }) => {
	// Apply CORS header for API routes and preflight requests
	if (event.url.pathname.startsWith('/api')) {
		// Handle preflight requests
		if (event.request.method === 'OPTIONS') {
			return new Response(null, {
				status: 200,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
					'Access-Control-Allow-Headers':
						'Content-Type, Authorization, apikey, X-Requested-With, X-Refresh-Token',
					'Access-Control-Max-Age': '86400'
				}
			});
		}
	}

	const response = await resolve(event);

	// Add CORS headers to API responses
	if (event.url.pathname.startsWith('/api')) {
		response.headers.set('Access-Control-Allow-Origin', '*');
		response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
		response.headers.set(
			'Access-Control-Allow-Headers',
			'Content-Type, Authorization, apikey, X-Requested-With, X-Refresh-Token'
		);
	}

	return response;
};

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

	// Handle JWT token authentication for API routes
	let tokenSession = null;
	let tokenUser = null;

	// Get headers from the request for better debugging
	const headers = new Headers(event.request.headers);

	// Check for authorization headers (case-insensitive)
	const authorizationHeader = headers.get('authorization') || headers.get('Authorization');
	const refreshTokenHeader = headers.get('x-refresh-token') || headers.get('X-Refresh-Token');

	// Extract tokens
	const jwt = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
	const refreshToken = refreshTokenHeader?.trim();

	// If we have a token and this is an API route, try to validate it
	const isApiOrAppRoute =
		event.url.pathname.startsWith('/api') || event.url.pathname.includes('/reports/pdf');

	if (jwt && isApiOrAppRoute) {
		const jwt = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();
		if (!jwt) {
			throw error(401, 'Unauthorized access: No JWT token provided');
		}
		const jwtSupabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			global: {
				headers: { Authorization: `Bearer ${jwt}` }
			},
			auth: { persistSession: false }
		});
		event.locals.supabase = jwtSupabase;
		return await resolve(event, {
			filterSerializedResponseHeaders(name) {
				return name === 'content-range' || name === 'x-supabase-api-version';
			}
		});
	}

	// Enhance session validation to include explicit debug logging
	event.locals.safeGetSession = async () => {
		// ✅ If JWT token has already been validated, return user even if no session
		if (tokenUser && event.url.pathname.startsWith('/api')) {
			console.log('Using tokenUser from earlier validation (safeGetSession)');
			return { session: tokenSession, user: tokenUser }; // tokenSession may be null — that's okay
		}

		// 🧪 Else, try to get session from Supabase client (cookie-based)
		try {
			// console.log(`Session validation for path: ${event.url.pathname}`);
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
			return { session, user };
		} catch (err) {
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
		PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(route + '/')) ||
		isExactApiRoute(pathname);

	// Special handling for API routes with JWT tokens
	if (pathname.startsWith('/api') && !sessionData.session && !isPublicRoute) {
		// For API device-data routes, check if we have a token in the Authorization header
		const headers = event.request.headers;
		const authHeader = headers.get('authorization') || headers.get('Authorization');
		const apiToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

		// If we have a token, validate it before proceeding
		if (apiToken) {
			// console.log('Validating API token for:', pathname);

			try {
				// Validate the token using Supabase auth
				const { data, error } = await event.locals.supabase.auth.getUser(apiToken);

				if (error || !data?.user) {
					console.error('Invalid API token:', error?.message || 'User not found');
					return new Response(JSON.stringify({ error: 'Invalid API token' }), {
						status: 401,
						headers: {
							'Content-Type': 'application/json',
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
							'Access-Control-Allow-Headers':
								'Content-Type, Authorization, apikey, X-Requested-With, X-Refresh-Token'
						}
					});
				}

				// Token is valid, set the user from the validated token
				//console.log('Valid API token for user:', data.user.email);
				event.locals.user = data.user;

				// Continue processing the request
				const response = await resolve(event, {
					filterSerializedResponseHeaders(name) {
						return name === 'content-range' || name === 'x-supabase-api-version';
					}
				});
				return response;
			} catch (err) {
				console.error('Error validating API token:', err);
				return new Response(JSON.stringify({ error: 'Error validating API token' }), {
					status: 401,
					headers: {
						'Content-Type': 'application/json',
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
						'Access-Control-Allow-Headers':
							'Content-Type, Authorization, apikey, X-Requested-With, X-Refresh-Token'
					}
				});
			}
		}
	}

	if (!isPublicRoute && !sessionData.session) {
		// For API routes, return 401 Unauthorized instead of redirecting
		if (pathname.startsWith('/api')) {
			// console.log(`Unauthorized API access attempt: ${pathname}`);
			return new Response(JSON.stringify({ error: 'Unauthorized' }), {
				status: 401,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		// console.log(`Redirecting unauthenticated user from protected route: ${pathname}`);
		throw redirect(302, '/auth/login');
	}

	// Store validated session and user in locals for routes to use
	event.locals.session = sessionData.session;
	event.locals.user = sessionData.user;
	// console.log('Session validated and stored in locals:', sessionData.user?.email || 'Guest');

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

// Combine the handles - CORS first, then Supabase
export const handle: Handle = async ({ event, resolve }) => {
	const { url } = event;
	if (
		url.pathname.startsWith('/sw.js') ||
		url.pathname.startsWith('/workbox-') ||
		url.pathname.startsWith('/manifest.webmanifest') ||
		url.pathname.startsWith('/registerSW.js') ||
		url.pathname.startsWith('/offline.html')
	) {
		return resolve(event);
	}

	// First apply CORS (handles preflight requests immediately)
	return await handleCORS({
		event,
		resolve: async (corsEvent) => {
			// Then apply Supabase handle (which includes route guards and may throw redirects)
			return await handleSupabase({
				event: corsEvent,
				resolve
			});
		}
	});
};
