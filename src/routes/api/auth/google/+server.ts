import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { AuthService } from '$lib/services/AuthService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { PUBLIC_DOMAIN } from '$env/static/public';

export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	try {
		// Create a new AuthService instance with the per-request Supabase client
		// This ensures authentication state is isolated per user/request
		const errorHandler = new ErrorHandlingService();
		const authService = new AuthService(supabase, errorHandler);

		// Attempt to sign in with the per-request auth service
		const { data: authData, error } = await supabase.auth.signInWithOAuth({
			provider: 'google',
			options: {
				redirectTo: `${PUBLIC_DOMAIN}/auth/callback`,
				queryParams: {
					access_type: 'offline',
					prompt: 'consent',
					next: '/app/dashboard' // Redirect after successful login
				}
			}
		});

		if (error || !authData || (authData.url && authData.url.length === 0)) {
			return json(
				{
					error: 'Google login failed. Please try again.'
				},
				{ status: 500 }
			);
		}

		// Login successful - cookies are automatically handled by the per-request client
		//console.log('Successfully authenticated user:', email);

		return json(authData.url, { status: 200 }); // Redirect to home or a specific page after successful login
	} catch (error) {
		console.error('Login error:', error);
		return json(
			{
				error: 'An unexpected error occurred'
			},
			{ status: 500 }
		);
	}
};
