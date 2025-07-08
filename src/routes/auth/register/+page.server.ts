import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { AuthService } from '$lib/services/AuthService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

export const actions: Actions = {
	register: async ({ request, locals }) => {
		const data = await request.formData();

		// Get form values
		const firstName = data.get('firstName')?.toString() || '';
		const lastName = data.get('lastName')?.toString() || '';
		const email = data.get('email')?.toString() || '';
		const password = data.get('password')?.toString() || '';
		const confirmPassword = data.get('confirmPassword')?.toString() || '';
		const company = data.get('company')?.toString() || '';
		const agreedToTerms = data.get('terms') === 'on';
		const agreedToPrivacy = data.get('privacy') === 'on';
		const agreedToCookies = data.get('cookies') === 'on';

		// Server-side validation
		const errors: Record<string, string> = {};

		if (!firstName.trim()) {
			errors.firstName = 'First name is required';
		}

		if (!lastName.trim()) {
			errors.lastName = 'Last name is required';
		}

		if (!email.trim()) {
			errors.email = 'Email is required';
		} else {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				errors.email = 'Please enter a valid email address';
			}
		}

		if (!password) {
			errors.password = 'Password is required';
		} else if (password.length < 8) {
			errors.password = 'Password must be at least 8 characters';
		}

		if (password !== confirmPassword) {
			errors.confirmPassword = 'Passwords do not match';
		}

		if (!company.trim()) {
			errors.company = 'Company name is required';
		}

		if (!agreedToTerms || !agreedToPrivacy || !agreedToCookies) {
			errors.terms = 'You must agree to all terms and policies';
		}

		// If there are validation errors, return them
		if (Object.keys(errors).length > 0) {
			return fail(400, {
				errors,
				firstName,
				lastName,
				email,
				company,
				agreedToTerms,
				agreedToPrivacy,
				agreedToCookies
			});
		}

		try {
			// Get error handler
			const errorHandler = new ErrorHandlingService();

			// Create AuthService with the request's Supabase client
			const authService = new AuthService(locals.supabase, errorHandler);

			// Register the user
			const result = await authService.register({
				email,
				password,
				firstName,
				lastName,
				company
			});

			if (!result.success) {
				// Registration failed
				return fail(400, {
					message: result.error || 'Registration failed',
					errors: {},
					firstName,
					lastName,
					email,
					company,
					agreedToTerms,
					agreedToPrivacy,
					agreedToCookies
				});
			}

			// Check if email verification is needed
			if (!result.emailConfirmationRequired) {
				// Redirect to check-email page with email parameter
				throw redirect(303, `/auth/check-email?email=${encodeURIComponent(email)}`);
			} else {
				// No email confirmation needed, redirect to login
				throw redirect(303, '/auth/login?registered=true');
			}
		} catch (err) {
			console.error('Registration error:', err);

			// If this is a redirect, let it pass through
			if (err instanceof Response && err.status === 303) {
				throw err;
			}

			return fail(500, {
				message: 'An unexpected error occurred during registration',
				errors: {},
				firstName,
				lastName,
				email,
				company,
				agreedToTerms,
				agreedToPrivacy,
				agreedToCookies
			});
		}
	}
};
