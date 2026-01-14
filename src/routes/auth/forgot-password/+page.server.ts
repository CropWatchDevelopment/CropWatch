import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	// If user is already logged in, they don't need password reset
	// but we still allow access to the page
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

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'FORGOT_PASSWORD');
		if (!recaptchaResult.success) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		if (!email) {
			return fail(400, { message: 'Email is required.' });
		}

		// Construct the redirect URL for after the user clicks the reset link
		const redirectTo = `${url.origin}/auth/callback?next=/account`;

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo
		});

		if (error) {
			console.error('Password reset error:', error);
			return fail(400, { message: error.message });
		}

		return {
			success: true,
			message: 'Check your email for a password reset link. If you don\'t see it, check your spam folder.'
		};
	}
};
