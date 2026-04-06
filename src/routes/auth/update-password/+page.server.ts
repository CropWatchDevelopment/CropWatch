import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
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

		// Call Supabase Auth REST API directly with the recovery access token
		const res = await fetch(`${PUBLIC_SUPABASE_URL}/auth/v1/user`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
				apikey: PUBLIC_SUPABASE_ANON_KEY
			},
			body: JSON.stringify({ password })
		});

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			console.error('Password update error:', res.status, body);
			return fail(500, { message: 'Failed to update password. The link may have expired.' });
		}

		// Clear the recovery token cookie
		cookies.delete('supabase_recovery_token', { path: '/' });

		redirect(303, '/auth/login?reason=password-reset');
	}
};
