import type { EmailOtpType } from '@supabase/supabase-js';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const DEFAULT_NEXT = '/auth/login';

/**
 * Where to continue after a verified email link: `next` as a path on this site.
 * Anything that resolves to another origin (`https://evil.example`,
 * `//evil.example`, `/\evil.example`, `javascript:`…) falls back, so the link
 * can never be used as an open redirect.
 */
function nextPath(next: string | null, url: URL): string {
	if (!next) return DEFAULT_NEXT;
	try {
		const target = new URL(next, url.origin);
		return target.origin === url.origin
			? `${target.pathname}${target.search}${target.hash}`
			: DEFAULT_NEXT;
	} catch {
		return DEFAULT_NEXT;
	}
}

export const GET: RequestHandler = async ({ url, cookies, locals }) => {
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	const next = nextPath(url.searchParams.get('next'), url);

	if (token_hash && type) {
		const { data, error } = await locals.services.supabaseAuth.verifyOtp({ type, token_hash });

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
