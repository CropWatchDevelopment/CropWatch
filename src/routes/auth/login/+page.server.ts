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
		const fullName = formData.get('fullName') as string;
		const username = formData.get('username') as string;
		const website = formData.get('website') as string;
		const avatarUrl = formData.get('avatarUrl') as string;
		const { session } = await safeGetSession();
		const { error } = await supabase.from('profiles').upsert({
			id: session?.user.id,
			full_name: fullName,
			username,
			website,
			avatar_url: avatarUrl,
			updated_at: new Date()
		});
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
