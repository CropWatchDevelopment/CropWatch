import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { UserRepository } from '$lib/repositories/UserRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Create error handler and repository
		const errorHandler = new ErrorHandlingService();
		const userRepo = new UserRepository(locals.supabase, errorHandler);

		// Check if the user is authenticated
		const {
			data: { user }
		} = await locals.supabase.auth.getUser();
		if (!user) {
			return json({ error: 'Authentication required' }, { status: 401 });
		}

		// Fetch user profiles using the repository
		const users = await userRepo.findAll();

		return json(users);
	} catch (error) {
		const errorHandler = new ErrorHandlingService();
		errorHandler.logError(error as Error);
		return json({ error: 'Failed to fetch users' }, { status: 500 });
	}
};
