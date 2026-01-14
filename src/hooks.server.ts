// src/hooks.server.ts
import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	// Create a Supabase client for this request, with cookie auth enabled
	event.locals.supabase = createServerClient(
		PUBLIC_SUPABASE_URL,
		PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
		{
			cookies: {
				getAll: () => event.cookies.getAll(),
				setAll: (cookiesToSet) => {
					cookiesToSet.forEach(({ name, value, options }) => {
						event.cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		}
	);

	event.locals.safeGetSession = async () => {
		// IMPORTANT: Always use getUser() for server-side validation as it contacts
		// the Supabase Auth server. getSession() only reads from cookies/storage
		// and can return stale/expired tokens.
		const {
			data: { user },
			error: userError
		} = await event.locals.supabase.auth.getUser();

		// If getUser() fails (expired token, invalid token, etc.), clear the session
		if (userError || !user) {
			return { session: null, user: null };
		}

		// Only after validating the user, get the session for the tokens
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		// Double-check: if we have a user but no session, something is wrong
		if (!session) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const isAuthRoute = event.url.pathname.startsWith('/auth');
	const isPublicApiRoute = event.url.pathname.startsWith('/api/public');

	// Redirect to auth if no valid session and not on auth/public routes
	if (!session && !isAuthRoute && !isPublicApiRoute) {
		throw redirect(303, '/auth');
	}

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};
