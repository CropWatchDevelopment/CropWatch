import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';

export const load: PageServerLoad = async ({ locals }) => {
  // Create a new SessionService instance with the per-request Supabase client
  const sessionService = new SessionService(locals.supabase);
  const sessionResult = await sessionService.getSafeSession();
  
  // If no session exists, redirect to login
  if (!sessionResult || !sessionResult.user) {
    throw redirect(302, '/auth/login');
  }

  const { user } = sessionResult;

  // Return user data to the page
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
    }
  };
};