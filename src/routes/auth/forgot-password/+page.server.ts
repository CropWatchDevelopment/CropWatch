import { m } from '$lib/paraglide/messages.js';
import { buildLoginPath, readRedirectPathFromUrl } from '$lib/utils/auth-redirect';
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

function readNonEmptyString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export const actions: Actions = {
	forgotPassword: async ({ request, url, locals }) => {
		const data = await request.formData();
		const redirectPath = readRedirectPathFromUrl(url, '');
		const email = readNonEmptyString(data.get('email'));
		const recaptchaToken = readNonEmptyString(data.get('recaptchaToken'));

		if (!email) {
			return fail(400, { message: m.auth_enter_email() });
		}

		if (!recaptchaToken) {
			return fail(400, { message: m.auth_security_try_again() });
		}

		const recaptchaResult = await locals.services.recaptcha.verify(
			recaptchaToken,
			'FORGOT_PASSWORD',
			0.5,
			{
				route: '/auth/forgot-password',
				flow: 'forgot-password',
				userAgent: request.headers.get('user-agent') ?? undefined
			}
		);
		if (!recaptchaResult.success) {
			return fail(400, { message: m.auth_security_try_again() });
		}

		const { error } = await locals.services.supabaseAuth.resetPasswordForEmail(email, {
			redirectTo: `${url.origin}${buildLoginPath({
				redirectTo: redirectPath,
				reason: 'password-reset'
			})}`
		});

		if (error) {
			console.error('Supabase resetPasswordForEmail error:', error);
			return fail(500, { message: m.auth_login_failed() });
		}

		// Always return success to avoid email enumeration
		return { success: true };
	}
};
