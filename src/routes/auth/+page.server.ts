// src/routes/auth/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	signup: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const recaptchaToken = formData.get('recaptchaToken') as string;

		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return fail(400, { message: 'reCAPTCHA verification required.' });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'SIGNUP', 0.5, {
			route: url.pathname,
			flow: 'signup',
			requestId: request.headers.get('x-vercel-id') ?? undefined,
			userAgent: request.headers.get('user-agent') ?? undefined
		});
		if (!recaptchaResult.success) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		try {
			const { error } = await supabase.auth.signUp({ email, password });
			if (error) {
				return fail(400, { message: error.message });
			}
		} catch (error) {
			console.error('Supabase signUp failed', {
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

		throw redirect(303, '/');
	},

	login: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const recaptchaToken = formData.get('recaptchaToken') as string;

		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return fail(400, { message: 'reCAPTCHA verification required.' });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'LOGIN', 0.5, {
			route: url.pathname,
			flow: 'login',
			requestId: request.headers.get('x-vercel-id') ?? undefined,
			userAgent: request.headers.get('user-agent') ?? undefined
		});
		if (!recaptchaResult.success) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		try {
			const { error } = await supabase.auth.signInWithPassword({ email, password });
			if (error) {
				return fail(400, { message: 'Invalid login.' });
			}
		} catch (error) {
			console.error('Supabase signInWithPassword failed', {
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

		throw redirect(303, '/');
	}
};
