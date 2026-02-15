import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ locals }) => {
	void locals;
	// Logged in users can still access the reset flow.
	return {};
};

export const actions: Actions = {
	resetPassword: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const recaptchaToken = formData.get('recaptchaToken') as string;

		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return fail(400, { message: 'reCAPTCHA verification required.' });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'FORGOT_PASSWORD', 0.5, {
			route: url.pathname,
			flow: 'forgot-password',
			requestId: request.headers.get('x-vercel-id') ?? undefined,
			userAgent: request.headers.get('user-agent') ?? undefined
		});
		if (!recaptchaResult.success) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		if (!email) {
			return fail(400, { message: 'Email is required.' });
		}

		// Construct the redirect URL for after the user clicks the reset link
		const redirectTo = `${url.origin}/auth/callback?next=/account`;

		try {
			const { error } = await supabase.auth.resetPasswordForEmail(email, {
				redirectTo
			});

			if (error) {
				console.error('Password reset error:', error);
				return fail(400, { message: error.message });
			}
		} catch (error) {
			console.error('Supabase resetPasswordForEmail failed', {
				route: url.pathname,
				supabaseUrlHost: (() => {
					try {
						return new URL(PUBLIC_SUPABASE_URL).host;
					} catch {
						return '<invalid>';
					}
				})(),
				requestId: request.headers.get('x-vercel-id') ?? undefined,
				error: error instanceof Error ? error.message : String(error)
			});
			return fail(503, { message: 'Auth service temporarily unavailable. Please try again.' });
		}

		return {
			success: true,
			message: 'Check your email for a password reset link. If you don\'t see it, check your spam folder.'
		};
	}
};
