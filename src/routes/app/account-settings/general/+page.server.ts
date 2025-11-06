import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) {
		redirect(303, '/');
	}
	const { data: profile } = await supabase
		.from('profiles')
		.select(`username, full_name, website, avatar_url, line_id`)
		.eq('id', session.user.id)
		.single();
	return { session, profile };
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
	disconnectLine: async ({ locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (!session) redirect(303, '/');
		await supabase
			.from('profiles')
			.update({ line_id: null, updated_at: new Date().toISOString() })
			.eq('id', session.user.id);
		return { lineDisconnected: true };
	},
	signout: async ({ locals: { supabase, safeGetSession } }) => {
		const { session } = await safeGetSession();
		if (session) {
			await supabase.auth.signOut();
			redirect(303, '/');
		}
	}
};
