import { env } from '$env/dynamic/private';
import { m } from '$lib/paraglide/messages.js';
import { readRedirectPathFromUrl, withRedirectParam } from '$lib/utils/auth-redirect';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';
import { getSupabaseClient } from '$lib/supabase.server';
import { fail, redirect, type Actions } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Company self-serve signup is behind ORGS_ENABLED (plan §12 #5), and
	// invite-link signups are always personal (the invite decides the org).
	return {
		companySignupEnabled: env.ORGS_ENABLED === 'true' && !url.searchParams.has('invite')
	};
};

function readNonEmptyString(value: FormDataEntryValue | null): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

export const actions: Actions = {
	default: async ({ request, url }) => {
		const data = await request.formData();
		const redirectPath = readRedirectPathFromUrl(url, '');

		const firstName = readNonEmptyString(data.get('firstName'));
		const lastName = readNonEmptyString(data.get('lastName'));
		const email = readNonEmptyString(data.get('email'));
		const password = readNonEmptyString(data.get('password'));
		const confirmPassword = readNonEmptyString(data.get('confirmPassword'));
		const company = readNonEmptyString(data.get('company'));
		const recaptchaToken = readNonEmptyString(data.get('recaptchaToken'));

		const agreedPrivacy = data.get('agreedPrivacy') === 'true';
		const agreedTerms = data.get('agreedTerms') === 'true';
		const agreedEula = data.get('agreedEula') === 'true';

		// ── Validation ─────────────────────────────────────────────
		if (!firstName || !lastName || !email || !password || !confirmPassword || !company) {
			return fail(400, {
				message: m.auth_all_fields_required(),
				firstName,
				lastName,
				email,
				company
			});
		}

		if (!recaptchaToken) {
			return fail(400, {
				message: m.auth_security_try_again(),
				firstName,
				lastName,
				email,
				company
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				message: m.auth_passwords_do_not_match_plain(),
				firstName,
				lastName,
				email,
				company
			});
		}

		if (!agreedPrivacy || !agreedTerms || !agreedEula) {
			return fail(400, {
				message: m.auth_must_agree_all_policies(),
				firstName,
				lastName,
				email,
				company
			});
		}

		// ── reCAPTCHA verification ─────────────────────────────────
		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'REGISTER', 0.5, {
			route: '/auth/create-account',
			flow: 'register',
			userAgent: request.headers.get('user-agent') ?? undefined
		});
		if (!recaptchaResult.success) {
			return fail(400, {
				message: m.auth_security_try_again(),
				firstName,
				lastName,
				email,
				company
			});
		}

		// ── Supabase sign-up (anon key — respects RLS) ─────────────
		const supabase = getSupabaseClient();

		// The 025 signup trigger reads account_type/company_name to create the
		// home org. Company signups are honored only while ORGS_ENABLED is on
		// and never from invite-link signups (they must stay personal).
		const accountType =
			env.ORGS_ENABLED === 'true' &&
			!url.searchParams.has('invite') &&
			data.get('account_type') === 'company'
				? 'company'
				: 'personal';

		const { error: signUpError } = await supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					first_name: firstName,
					last_name: lastName,
					company,
					account_type: accountType,
					...(accountType === 'company' ? { company_name: company } : {}),
					agreed_privacy: true,
					agreed_terms: true,
					agreed_eula: true
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
					? m.auth_account_exists()
					: m.auth_registration_failed();

			return fail(signUpError.status ?? 500, {
				message: userFacingMessage,
				firstName,
				lastName,
				email,
				company
			});
		}

		// Success – send user to the "check your email" page
		throw redirect(303, withRedirectParam('/auth/create-account/check-email', redirectPath));
	}
};
