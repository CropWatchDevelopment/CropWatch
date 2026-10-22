import { cookieName as localeCookieName } from '$lib/paraglide/runtime';
import { buildLoginPath, readRedirectPathFromUrl } from '$lib/utils/auth-redirect';
import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Signing out changes state, so it is a POST form action (SvelteKit checks the
// origin of every form POST). Opening /auth/logout with a GET — an old link, or
// another site linking here — only shows the "Log out" button.
export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.jwtString) {
		redirect(303, buildLoginPath({ redirectTo: readRedirectPathFromUrl(url, '') }));
	}
	return {};
};

export const actions: Actions = {
	default: async ({ cookies, locals, url }) => {
		// End the session in Supabase Auth too, so its refresh token stops working.
		if (locals.jwtString) {
			await locals.services.supabaseAuth.signOut(locals.jwtString);
		}

		// Every cookie goes except the language choice, a preference and not session state.
		for (const { name } of cookies.getAll()) {
			if (name !== localeCookieName) cookies.delete(name, { path: '/' });
		}

		redirect(
			303,
			buildLoginPath({ redirectTo: readRedirectPathFromUrl(url, ''), reason: 'signed-out' })
		);
	}
};
