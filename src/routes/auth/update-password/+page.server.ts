import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { AuthService } from '$lib/services/AuthService';

// Make sure users are authenticated to access this page
export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	// Get error handler from container
	const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
	// Create AuthService with the request's Supabase client
	const authService = new AuthService(supabase, errorHandler);
	const session = await authService.getSession();
	// If not logged in, redirect to login page
	if (!session || (session && !session.user)) {
		throw redirect(302, '/auth/login');
	}

	return {};
};

export const actions: Actions = {
	default: async ({ request, locals: { supabase } }) => {
		try {
			// Check if user is authenticated
			const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
			// Create AuthService with the request's Supabase client
			const authService = new AuthService(locals.supabase, errorHandler);
			const session = await authService.getSession();
			if (!session) {
				return fail(401, { error: 'You must be logged in to update your password' });
			}

			// Parse form data
			const formData = await request.formData();
			const newPassword = formData.get('newPassword')?.toString() || '';
			const confirmPassword = formData.get('confirmPassword')?.toString() || '';

			if (newPassword.length < 8) {
				return fail(400, { error: 'New password must be at least 8 characters long' });
			}

			if (newPassword !== confirmPassword) {
				return fail(400, { error: "New passwords don't match" });
			}

			// Update the password
			const result = await authService.updatePassword(newPassword);

			if (!result.success) {
				return fail(400, { error: result.error || 'Failed to update password' });
			}

			return { success: true };
		} catch (error) {
			console.error('Password update error:', error);
			return fail(500, { error: 'An unexpected error occurred. Please try again later.' });
		}
	}
};
