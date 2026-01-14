// src/routes/auth/+page.server.ts
import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		throw redirect(303, '/');
	}
	return {};
};

export const actions: Actions = {
	signup: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const recaptchaToken = formData.get('recaptchaToken') as string;

		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return fail(400, { message: 'reCAPTCHA verification required.' });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'SIGNUP');
		if (!recaptchaResult.success) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		const { error } = await supabase.auth.signUp({ email, password });
		if (error) {
			return fail(400, { message: error.message });
		}

		throw redirect(303, '/');
	},

	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const recaptchaToken = formData.get('recaptchaToken') as string;

		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return fail(400, { message: 'reCAPTCHA verification required.' });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'LOGIN');
		if (!recaptchaResult.success) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		const { error } = await supabase.auth.signInWithPassword({ email, password });
		if (error) {
			return fail(400, { message: 'Invalid login.' });
		}

		throw redirect(303, '/');
	}
};
