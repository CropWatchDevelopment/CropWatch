import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { TYPES } from '$lib/server/ioc.types';
import { AuthService } from '$lib/services/AuthService';
import { container } from '$lib/server/ioc.config';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Parse the request body
		const { email, password } = await request.json();

                // Get AuthService from IoC container
                const authService = container.get<AuthService>(TYPES.AuthService);

		// Attempt to sign in with the per-request auth service
		const authData = await authService.signInWithPassword(email, password);

		if (!authData) {
			return json(
				{
					error: 'Invalid email or password'
				},
				{ status: 401 }
			);
		}
		
		 // Login successful - cookies are automatically handled by the per-request client
		console.log('Successfully authenticated user:', email);

		return json({
			success: true,
			user: {
				id: authData.user.id,
				email: authData.user.email,
				name: authData.user.user_metadata?.name || email.split('@')[0],
				access_token: authData.session.access_token,
				refresh_token: authData.session.refresh_token,
				expires_at: authData.session.expires_at,
			}
		});
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
