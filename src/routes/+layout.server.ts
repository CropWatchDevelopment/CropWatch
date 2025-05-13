import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const { cookies, url, depends, locals } = event;

	// Register dependency on Supabase auth - this ensures the layout rerenders when auth state changes
	depends('supabase:auth');

	// Skip auth check for auth routes
	const isAuthRoute = url.pathname.startsWith('/auth');

	// Get all cookies to pass to the client
	const cookieList = cookies.getAll();

	// Get session and user from locals (already validated in hooks.server.ts)
	const session = locals.session;
	const user = locals.user;

	// Added additional logging for debugging redirection logic
	if (!session?.user && !isAuthRoute) {
		console.warn('No session found, redirecting to login:', url.pathname);
		throw redirect(302, '/auth/login');
	}

	// Return everything needed by the client except the Supabase client (which is not serializable)
	return {
		session,
		cookies: cookieList,
		user: user
			? {
					id: user.id,
					email: user.email,
					name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
				}
			: {
					id: null,
					email: 'Guest',
					name: 'Guest'
				}
	};
};
