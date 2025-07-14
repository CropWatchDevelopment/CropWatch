import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { AuthService } from '$lib/services/AuthService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

// Handle password reset token verification and redirect logged-in users
export const load: PageServerLoad = async ({ url, locals }) => {
	const errorHandler = new ErrorHandlingService();
	const authService = new AuthService(locals.supabase, errorHandler);

	// Check if user is already logged in
	const user = await authService.getSession();
	if (user) {
		// If logged in, redirect to account settings
		throw redirect(303, '/account/update-password');
	}

	// Check for password reset token in URL
	const token_hash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type');

	if (!token_hash || type !== 'recovery') {
		// No valid token, redirect to forgot password page
		throw redirect(303, '/auth/forgot-password');
	}

	// Verify the reset token
	const { error } = await locals.supabase.auth.verifyOtp({
		token_hash,
		type: 'recovery'
	});

	if (error) {
		console.error('Token verification error:', error);
		// Invalid or expired token, redirect to forgot password
		throw redirect(303, '/auth/forgot-password');
	}

	return {
		tokenVerified: true
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		try {
			// Parse form data
			const formData = await request.formData();
			const newPassword = formData.get('newPassword')?.toString() || '';
			const confirmPassword = formData.get('confirmPassword')?.toString() || '';

			// Validate password
			if (!newPassword) {
				return fail(400, {
					error: 'New password is required',
					newPassword: '',
					confirmPassword: ''
				});
			}

			if (newPassword.length < 8) {
				return fail(400, {
					error: 'Password must be at least 8 characters long',
					newPassword: '',
					confirmPassword: ''
				});
			}

			// Validate password confirmation
			if (newPassword !== confirmPassword) {
				return fail(400, { error: 'Passwords do not match', newPassword: '', confirmPassword: '' });
			}

			// Get services
			const errorHandler = new ErrorHandlingService();
			const authService = new AuthService(locals.supabase, errorHandler);

			// Update password
			const result = await authService.updatePassword(newPassword);

			if (!result.success) {
				console.error('Password update error:', result.error);
				return fail(400, {
					error: result.error || 'Failed to update password',
					newPassword: '',
					confirmPassword: ''
				});
			}

			// Password updated successfully
			return {
				success: true
			};
		} catch (error) {
			console.error('Password update request error:', error);
			return fail(500, {
				error: 'An error occurred. Please try again later.',
				newPassword: '',
				confirmPassword: ''
			});
		}
	}
};
