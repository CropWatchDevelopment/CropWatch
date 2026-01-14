// src/routes/auth/login/google/+server.ts
import { redirect } from '@sveltejs/kit';

export const GET = async ({ locals, url }) => {
  const { supabase } = locals;
  // Call Supabase to get the OAuth authorization URL for Google
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${url.origin}/auth/callback` }
  });
  if (error) {
    console.error('Google OAuth error:', error);
    throw redirect(303, '/auth?error=oauth'); // handle error as needed
  }
  // Redirect the user to the Google consent screen (via Supabase)
  throw redirect(303, data.url);
};
