import type { SupabaseAuthClient } from '@supabase/supabase-js/dist/module/lib/SupabaseAuthClient';
import { writable } from 'svelte/store';

export const alertState = writable<string[]>([]);

export function AddAlert(alert: string) {
    alertState.update((state) => [alert, ...state])
}
