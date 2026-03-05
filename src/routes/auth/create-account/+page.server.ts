import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';
import { getSupabaseClient } from '$lib/supabase.server';
import { fail, redirect, type Actions } from '@sveltejs/kit';

const SECURITY_CHECK_MESSAGE = 'Security verification failed. Please try again.';
const REGISTRATION_FAILED_MESSAGE = 'Unable to create account right now. Please try again.';

function readNonEmptyString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export const actions: Actions = {
	default: async ({ request }) => {
		const data = await request.formData();

		const firstName = readNonEmptyString(data.get('firstName'));
		const lastName = readNonEmptyString(data.get('lastName'));
		const email = readNonEmptyString(data.get('email'));
		const password = readNonEmptyString(data.get('password'));
		const confirmPassword = readNonEmptyString(data.get('confirmPassword'));
		const company = readNonEmptyString(data.get('company'));
		const recaptchaToken = readNonEmptyString(data.get('recaptchaToken'));

		const agreedTerms = data.get('agreedTerms') === 'true';
		const agreedPrivacy = data.get('agreedPrivacy') === 'true';
		const agreedCookies = data.get('agreedCookies') === 'true';

		// ── Validation ─────────────────────────────────────────────
		if (!firstName || !lastName || !email || !password || !confirmPassword || !company) {
			return fail(400, {
				message: 'All fields are required.',
				firstName,
				lastName,
				email,
				company
			});
		}

		if (!recaptchaToken) {
			return fail(400, {
				message: SECURITY_CHECK_MESSAGE,
				firstName,
				lastName,
				email,
				company
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				message: 'Passwords do not match.',
				firstName,
				lastName,
				email,
				company
			});
		}

		if (!agreedTerms || !agreedPrivacy || !agreedCookies) {
			return fail(400, {
				message: 'You must agree to all required policies to register.',
				firstName,
				lastName,
				email,
				company
			});
		}

		// ── reCAPTCHA verification ─────────────────────────────────
		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'REGISTER');
		if (!recaptchaResult.success) {
			return fail(400, {
				message: SECURITY_CHECK_MESSAGE,
				firstName,
				lastName,
				email,
				company
			});
		}

		// ── Supabase sign-up (anon key — respects RLS) ─────────────
		const supabase = getSupabaseClient();

		const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					first_name: firstName,
					last_name: lastName,
					company,
					agreed_terms: true,
					agreed_privacy: true,
					agreed_cookies: true
				}
			}
		});

		if (signUpError) {
			console.error('Supabase sign-up error:', signUpError);

			const msg = signUpError.message?.toLowerCase() ?? '';
			const userFacingMessage =
				msg.includes('already been registered') ||
				msg.includes('already registered') ||
				msg.includes('duplicate')
					? 'An account with this email already exists.'
					: REGISTRATION_FAILED_MESSAGE;

			return fail(signUpError.status ?? 500, {
				message: userFacingMessage,
				firstName,
				lastName,
				email,
				company
			});
		}

		// Success – send user to the "check your email" page
		throw redirect(303, '/auth/create-account/check-email');
	}
};
