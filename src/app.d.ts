// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces

import type { Database } from "$lib/types/database.types";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
			supabaseCookies?: Array<{
				name: string;
				value: string;
				options: {
					path?: string;
					httpOnly?: boolean;
					secure?: boolean;
					sameSite?: boolean | 'strict' | 'lax' | 'none';
					maxAge?: number;
					domain?: string;
				};
			}>;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

export { };