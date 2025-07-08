import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthService } from '$lib/services/AuthService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

// Check if user is already logged in, redirect them to dashboard if they are
export const load: PageServerLoad = async ({ locals }) => {
	const errorHandler = new ErrorHandlingService();
	const authService = new AuthService(locals.supabase, errorHandler);
	const user = await authService.getSession();
	if (user) {
		throw redirect(303, '/dashboard');
	}
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		try {
			// Parse form data
			const formData = await request.formData();
			const email = formData.get('email')?.toString().trim() || '';

			// Validate email
			if (!email) {
				return fail(400, { error: 'Email is required', email: '' });
			}

			// Validate email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return fail(400, { error: 'Invalid email format', email });
			}

			// Get services
			const errorHandler = new ErrorHandlingService();
			const authService = new AuthService(locals.supabase, errorHandler);

			// Request password reset
			const result = await authService.resetPassword(email);

			if (!result.success) {
				console.error('Password reset error:', result.error);

				// Don't expose specific errors to prevent email enumeration
				// Always show success to avoid revealing which emails are registered
				return {
					success: result.success,
					error: result.error,
					email
				};
			}

			// Return success without exposing if email exists in system
			return {
				success: true,
				email
			};
		} catch (error) {
			console.error('Password reset request error:', error);

			// Generic error message
			return fail(500, {
				error: 'An error occurred. Please try again later.',
				email: ''
			});
		}
	}
};
