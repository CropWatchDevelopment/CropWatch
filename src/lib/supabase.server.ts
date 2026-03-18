import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * Server-side Supabase client using the public anon key.
 * Safe to use in `+page.server.ts` / `+server.ts` — the anon key
 * is subject to RLS and does not bypass security policies.
 */
export function getSupabaseClient() {
	return createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
