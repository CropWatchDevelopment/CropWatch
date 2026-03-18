import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';

/**
 * Server-side Supabase client using the public anon key.
 * Safe to use in `+page.server.ts` / `+server.ts` — the anon key
 * is subject to RLS and does not bypass security policies.
 */
export function getSupabaseClient() {
	const publicSupabaseUrl = (publicEnv.PUBLIC_SUPABASE_URL ?? '').trim();
	const publicSupabaseAnonKey = (publicEnv.PUBLIC_SUPABASE_ANON_KEY ?? '').trim();

	if (!publicSupabaseUrl || !publicSupabaseAnonKey) {
		throw new Error('Supabase public environment variables are missing.');
	}

	return createClient(publicSupabaseUrl, publicSupabaseAnonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}
