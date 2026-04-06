import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';
import { getSupabaseClient } from '$lib/supabase.server';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	const next = url.searchParams.get('next') ?? '/auth/login';

	if (token_hash && type) {
		const supabase = getSupabaseClient();
		const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

		if (!error && data.session) {
			// For recovery flow, store the access token so the update-password page can use it
			if (type === 'recovery') {
				cookies.set('supabase_recovery_token', data.session.access_token, {
					path: '/',
					httpOnly: true,
					secure: url.protocol === 'https:',
					sameSite: 'lax',
					maxAge: 600 // 10 minutes
				});
			}

			redirect(303, next);
		}
	}

	// Token invalid or missing — send to an error-aware login page
	redirect(303, '/auth/login?reason=auth-required');
};
