import type { LayoutServerLoad } from './$types';
import { loadInitialAppState } from '$lib/data/SourceOfTruth.svelte';
import { redirect } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const { session, user } = await locals.safeGetSession();
	
	// If no valid session, the hooks.server.ts should have already redirected.
	// But as a safety net, redirect here too if somehow we got here without a session.
	if (!session) {
		// Return minimal data for auth pages (hooks allows /auth routes through)
		return {
			user: null,
			profile: null,
			session: null,
			cookies: cookies.getAll(),
			facilities: [],
			locations: [],
			devices: [],
			alerts: [],
			isLoggedIn: false,
			nextCursor: null
		};
	}

	const tokens = {
		access_token: session.access_token,
		refresh_token: session.refresh_token
	};
	console.log(tokens);

	let profile: { id?: string; full_name?: string | null; avatar_url?: string | null; email?: string | null } | null = null;

	try {
		const { data: profileData, error: profileError } = await locals.supabase
			.from('profiles')
			.select('id, full_name, avatar_url, email')
			.eq('id', session.user.id)
			.maybeSingle();

		if (!profileError && profileData) {
			profile = profileData;
		}
	} catch (error) {
		console.error('Failed to load profile in layout', error);
	}

	try {
		const { nextCursor, ...appState } = await loadInitialAppState(tokens);
		appState.isLoggedIn = true;
		appState.profile = profile;
		appState.userEmail = session.user.email ?? profile?.email ?? null;
		return {
			...appState,
			session,
			user,
			profile,
			cookies: cookies.getAll(),
			nextCursor
		};
	} catch (error) {
		console.error('Failed to load initial app state', error);
		
		// If we have a session but data loading fails, it might be a token issue
		// Redirect to auth to re-authenticate
		throw redirect(303, '/auth');
	}
};
