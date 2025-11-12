import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	// Don't return the supabase client - it's not serializable
	// The client is available in the browser through other means
	return {};
};

export const actions: Actions = {
	update: async ({ request, locals: { supabase, safeGetSession } }) => {
		const formData = await request.formData();
		const fullName = formData.get('fullName');
		const username = formData.get('username');
		const website = formData.get('website');
		const avatarUrl = formData.get('avatarUrl');
		const { session } = await safeGetSession();

		if (!session?.user) {
			return fail(401, { error: 'Authentication required' });
		}

		if (
			typeof fullName !== 'string' ||
			typeof username !== 'string' ||
			typeof website !== 'string' ||
			typeof avatarUrl !== 'string'
		) {
			return fail(400, { error: 'Invalid form submission' });
		}

		const payload = {
			id: session.user.id,
			full_name: fullName,
			username,
			website,
			avatar_url: avatarUrl,
			updated_at: new Date().toISOString()
		};

		const { error } = await supabase.from('profiles').upsert([payload]);
		if (error) {
			return fail(500, {
				fullName,
				username,
				website,
				avatarUrl
			});
		}
		return {
			fullName,
			username,
			website,
			avatarUrl
		};
	},
	signout: async ({ locals: { supabase }, cookies }) => {
		try {
			// Sign out from Supabase with local scope to only affect current browser
			await supabase.auth.signOut({
				scope: 'local'
			});

			// Clear Supabase auth cookies
			const authCookies = cookies.getAll();
			for (const cookie of authCookies) {
				if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
					cookies.delete(cookie.name, { path: '/' });
				}
			}
		} catch (error) {
			console.error('Signout error:', error);
		}

		// Always redirect to home page after signout attempt
		redirect(303, '/');
	}
};
