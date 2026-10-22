import { m } from '$lib/paraglide/messages.js';
import { isStrongPassword } from '$lib/utils/strongPasswordCheck';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies }) => {
	const token = cookies.get('supabase_recovery_token');
	if (!token) {
		redirect(303, '/auth/login?reason=auth-required');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const token = cookies.get('supabase_recovery_token');
		if (!token) {
			redirect(303, '/auth/login?reason=auth-required');
		}

		const data = await request.formData();
		const password = String(data.get('password') ?? '');
		const confirmPassword = String(data.get('confirmPassword') ?? '');

		// The same policy the form shows (and sign-up enforces), checked here too.
		if (!isStrongPassword(password).isValid) {
			return fail(400, { message: m.auth_password_too_weak() });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: m.auth_passwords_do_not_match_plain() });
		}

		// Supabase Auth REST API, authorized by the recovery access token
		const res = await locals.services.supabaseAuth.updatePasswordWithRecoveryToken(token, password);

		if (!res.ok) {
			const body = await res.json().catch(() => ({}));
			console.error('Password update error:', res.status, body);
			return fail(500, { message: m.auth_update_password_failed() });
		}

		// Clear the recovery token cookie
		cookies.delete('supabase_recovery_token', { path: '/' });

		redirect(303, '/auth/login?reason=password-reset');
	}
};
