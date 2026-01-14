import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { verifyRecaptchaToken } from '$lib/utils/recaptcha.server';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) {
		throw redirect(303, '/');
	}
	return {};
};

// Password validation helper
function validatePassword(password: string): { valid: boolean; message?: string } {
	// Check minimum length
	if (password.length < 8) {
		return { valid: false, message: 'Password must be at least 8 characters long.' };
	}

	// Check for lowercase letter
	if (!/[a-z]/.test(password)) {
		return { valid: false, message: 'Password must contain at least one lowercase letter.' };
	}

	// Check for uppercase letter
	if (!/[A-Z]/.test(password)) {
		return { valid: false, message: 'Password must contain at least one uppercase letter.' };
	}

	// Check for number
	if (!/[0-9]/.test(password)) {
		return { valid: false, message: 'Password must contain at least one number.' };
	}

	// Check for symbol
	if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
		return { valid: false, message: 'Password must contain at least one symbol.' };
	}

	// Check for valid ASCII characters only (no unicode outside ASCII printable range)
	if (!/^[\x20-\x7E]*$/.test(password)) {
		return { valid: false, message: 'Password must only contain standard ASCII characters.' };
	}

	return { valid: true };
}

export const actions: Actions = {
	register: async ({ request, locals: { supabase }, url }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;
		const confirmPassword = formData.get('confirm_password') as string;
		const fullName = formData.get('full_name') as string;
		const employer = formData.get('employer') as string;
		const acceptEula = formData.get('accept_eula') === 'on';
		const acceptPrivacy = formData.get('accept_privacy') === 'on';
		const acceptTerms = formData.get('accept_terms') === 'on';
		const recaptchaToken = formData.get('recaptchaToken') as string;

		// Verify reCAPTCHA
		if (!recaptchaToken) {
			return fail(400, { message: 'reCAPTCHA verification required.' });
		}

		const recaptchaResult = await verifyRecaptchaToken(recaptchaToken, 'REGISTER');
		if (!recaptchaResult.success) {
			return fail(400, { message: 'reCAPTCHA verification failed. Please try again.' });
		}

		// Validate required fields
		if (!email || !password || !fullName) {
			return fail(400, { message: 'Email, password, and full name are required.' });
		}

		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, { message: 'Please enter a valid email address.' });
		}

		// Validate password
		const passwordValidation = validatePassword(password);
		if (!passwordValidation.valid) {
			return fail(400, { message: passwordValidation.message });
		}

		// Check passwords match
		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		// Check legal agreements
		if (!acceptEula || !acceptPrivacy || !acceptTerms) {
			return fail(400, { message: 'You must accept all legal agreements to register.' });
		}

		// Construct the redirect URL for email confirmation
		const redirectTo = `${url.origin}/auth/callback`;

		// Create the user with Supabase
		const { data, error } = await supabase.auth.signUp({
			email,
			password,
			options: {
				emailRedirectTo: redirectTo,
				data: {
					full_name: fullName,
					employer: employer || null
				}
			}
		});

		if (error) {
			console.error('Registration error:', error);
			return fail(400, { message: error.message });
		}

		// Check if email confirmation is required
		if (data.user && !data.session) {
			// User was created but needs to confirm email
			return {
				success: true,
				message: 'Registration successful! Please check your email to confirm your account.'
			};
		}

		// If we got a session, the user is immediately logged in (email confirmation disabled)
		if (data.session) {
			throw redirect(303, '/');
		}

		return {
			success: true,
			message: 'Registration successful! Please check your email to confirm your account.'
		};
	}
};
