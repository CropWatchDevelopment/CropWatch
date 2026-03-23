import { m } from '$lib/paraglide/messages.js';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';
import { getSupabaseClient } from '$lib/supabase.server';
import { fail, type Actions } from '@sveltejs/kit';

function readNonEmptyString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export const actions: Actions = {
	forgotPassword: async ({ request, url }) => {
		const data = await request.formData();
		const email = readNonEmptyString(data.get('email'));
		const recaptchaToken = readNonEmptyString(data.get('recaptchaToken'));

		if (!email) {
			return fail(400, { message: m.auth_enter_email() });
		}

		if (!recaptchaToken) {
			return fail(400, { message: m.auth_security_try_again() });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'FORGOT_PASSWORD');
		if (!recaptchaResult.success) {
			return fail(400, { message: m.auth_security_try_again() });
		}

		const supabase = getSupabaseClient();

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}/auth/login`
		});

		if (error) {
			console.error('Supabase resetPasswordForEmail error:', error);
			throw error;
			// Don't reveal whether the email exists — always show success
		}

		// Always return success to avoid email enumeration
		return { success: true };
	}
};
