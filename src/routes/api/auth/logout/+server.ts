import { json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { AuthService } from '$lib/services/AuthService';

export const POST: RequestHandler = async ({ locals, cookies }) => {
  try {
    console.log('Server logout endpoint called');

    // Get AuthService from IoC container
    const authService = container.get<AuthService>(TYPES.AuthService);

    // Sign out the user using the auth service
    await authService.signOut();


    // kill the cookies
    const authCookies = cookies.getAll();
    for (const cookie of authCookies) {
      if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
        cookies.delete(cookie.name, { path: '/' });
      }
    }

    // is it dead yet?
    const sessionAfter = await authService.getSession();
    console.log('Session after logout:', sessionAfter?.user?.email || 'No session');

    return json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return json({
      error: 'An unexpected error occurred during logout'
    }, { status: 500 });
  }
};