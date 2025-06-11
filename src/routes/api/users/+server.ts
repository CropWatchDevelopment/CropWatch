import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IAuthService } from '$lib/interfaces/IAuthService';
import { UserRepository } from '$lib/repositories/UserRepository';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

export const GET: RequestHandler = async () => {
  try {
    // Get services from IoC container
    const authService = container.get<IAuthService>(TYPES.AuthService);
    const userRepo = container.get<UserRepository>(TYPES.UserRepository);

    // Check if the user is authenticated
    const sessionData = await authService.getSession();
    if (!sessionData) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch user profiles using the repository
    const users = await userRepo.findAll();

    return json(users);
  } catch (error) {
    const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
    errorHandler.logError(error as Error);
    return json({ error: 'Failed to fetch users' }, { status: 500 });
  }
};