import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('supabase_recovery_token');
	if (!token) {
		redirect(303, '/auth/login?reason=auth-required');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const token = cookies.get('supabase_recovery_token');
		if (!token) {
			redirect(303, '/auth/login?reason=auth-required');
		}

		const data = await request.formData();
		const password = data.get('password') as string;
		const confirmPassword = data.get('confirmPassword') as string;

		if (!password || password.length < 6) {
			return fail(400, { message: 'Password must be at least 6 characters.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		// Create a Supabase client authenticated with the recovery access token
		const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			},
			global: {
				headers: {
					Authorization: `Bearer ${token}`
				}
			}
		});

		const { error } = await supabase.auth.updateUser({ password });

		if (error) {
			console.error('Password update error:', error);
			return fail(500, { message: 'Failed to update password. The link may have expired.' });
		}

		// Clear the recovery token cookie
		cookies.delete('supabase_recovery_token', { path: '/' });

		redirect(303, '/auth/login?reason=password-reset');
	}
};
