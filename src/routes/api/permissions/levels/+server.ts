import 'reflect-metadata';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IAuthService } from '$lib/interfaces/IAuthService';
import { PermissionLevelRepository } from '$lib/repositories/PermissionLevelRepository';

export const GET: RequestHandler = async () => {
  try {
    // Get services from IoC container
    const authService = container.get<IAuthService>(TYPES.AuthService);
    const repo = container.get<PermissionLevelRepository>(TYPES.PermissionLevelRepository);

    // Check if the user is authenticated
    const sessionData = await authService.getSession();
    if (!sessionData) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    // Fetch permission levels from the repository
    const data = await repo.findAll();
    return json(data);
  } catch (error) {
    console.error('Error fetching permission levels:', error);
    return json({ error: 'Failed to fetch permission levels' }, { status: 500 });
  }
};