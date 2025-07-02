import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import type { IAuthService } from '$lib/interfaces/IAuthService';
import type { ISessionService } from '$lib/interfaces/ISessionService';
import { AuthService } from '$lib/services/AuthService';
import type { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	try {
		//console.log('Server logout endpoint called');

		// Create a new AuthService instance with the per-request Supabase client
		// This ensures authentication state is isolated per user/request
		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		const authService = new AuthService(locals.supabase, errorHandler);

		// Sign out the user using the auth service
		await authService.signOut();

		// Also sign out using the request-scoped Supabase client
		if (locals.supabase) {
			await locals.supabase.auth.signOut();
		}

		// kill the cookies
		const authCookies = cookies.getAll();
		for (const cookie of authCookies) {
			if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
				cookies.delete(cookie.name, { path: '/' });
			}
		}

		// is it dead yet?
		const sessionAfter = await authService.getSession();
		//console.log('Session after logout:', sessionAfter?.user?.email || 'No session');

		return json({
			success: true,
			message: 'Logged out successfully'
		});
	} catch (error) {
		console.error('Logout error:', error);
		return json(
			{
				error: 'An unexpected error occurred during logout'
			},
			{ status: 500 }
		);
	}
};
