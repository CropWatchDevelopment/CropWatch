import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { AuthService } from '$lib/services/AuthService';

export const GET: RequestHandler = async ({ locals }) => {
  try {
    // Get AuthService from IoC container
    const authService = container.get<AuthService>(TYPES.AuthService);
    
    // Get the current session
    const sessionData = await authService.getSession();
    
    if (!sessionData) {
      return json({ authenticated: false });
    }
    
    const { user } = sessionData;
    
    // Return user data
    return json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
      }
    });
    
  } catch (error) {
    console.error('Error checking authentication status:', error);
    return json({ 
      authenticated: false, 
      reason: 'Error checking authentication status'
    });
  }
};