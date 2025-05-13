import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { AuthService } from '$lib/services/AuthService';
import type { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		// Parse the request body
		const userData = await request.json();
		
		// Validate required fields
		if (!userData.email || !userData.password || !userData.firstName || 
			!userData.lastName || !userData.company) {
			return json({ 
				success: false, 
				error: 'All fields are required' 
			}, { status: 400 });
		}
		
		// Validate email format
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(userData.email)) {
			return json({ 
				success: false, 
				error: 'Invalid email format' 
			}, { status: 400 });
		}
		
		// Validate password length
		if (userData.password.length < 8) {
			return json({ 
				success: false, 
				error: 'Password must be at least 8 characters' 
			}, { status: 400 });
		}
		
		// Get error handler from container
		const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
		
		// Create AuthService with the request's Supabase client
		const authService = new AuthService(locals.supabase, errorHandler);
		
		// Register the user
		const result = await authService.register({
			email: userData.email,
			password: userData.password,
			firstName: userData.firstName,
			lastName: userData.lastName,
			company: userData.company
		});
		
		if (!result.success) {
			return json({ 
				success: false, 
				error: result.error || 'Registration failed' 
			}, { status: 400 });
		}
		
		return json({ 
			success: true,
			message: 'Registration successful.',
			emailConfirmationRequired: result.emailConfirmationRequired || false
		});
	} catch (err) {
		console.error('API Registration error:', err);
		
		return json({ 
			success: false, 
			error: 'An unexpected error occurred during registration'
		}, { status: 500 });
	}
};