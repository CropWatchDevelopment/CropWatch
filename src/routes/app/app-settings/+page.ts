import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
  depends('supabase:auth');
  
  const { session, supabase } = await parent();
  
  if (!session) {
    throw redirect(303, '/auth/login?redirect=/app/app-settings');
  }
  
  return {
    supabase
  };
};