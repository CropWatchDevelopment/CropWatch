import type { Session, User } from '@supabase/supabase-js';

/**
 * Interface for session management service
 * Provides safe access to authenticated sessions
 */
export interface ISessionService {
	/**
	 * Gets a validated session and user
	 * Similar to safeGetSession in hooks.server.ts
	 * Ensures JWT is valid before returning session
	 */
	getSafeSession(): Promise<{ session: Session | null; user: User | null }>;
}
