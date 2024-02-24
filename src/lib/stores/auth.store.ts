import type { SupabaseAuthClient } from '@supabase/supabase-js/dist/module/lib/SupabaseAuthClient';
import { writable } from 'svelte/store';

export const authState = writable<SupabaseAuthClient | null>();

export function SetAuthState(state: SupabaseAuthClient | null) {
    authState.set(state);
}
