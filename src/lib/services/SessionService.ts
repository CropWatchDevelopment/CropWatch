import type { ISessionService } from '../interfaces/ISessionService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';

/**
 * Service for handling session-related operations
 * Refactored to accept a Supabase client directly instead of using IoC injection
 */
export class SessionService implements ISessionService {
  private supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.supabaseClient = supabaseClient;
  }

  /**
   * Gets a validated session by checking both getSession and getUser
   * Ensures the JWT token is valid before returning the session
   */
  async getSafeSession(): Promise<{ session: Session | null; user: User | null }> {
    try {
      // First, get the current session
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      
      if (!session) {
        console.debug('SessionService: No session found');
        return { session: null, user: null };
      }

      // Validate the JWT by getting the user
      const { data: { user }, error } = await this.supabaseClient.auth.getUser();
      
      if (error) {
        console.error('SessionService: JWT validation failed:', error);
        return { session: null, user: null };
      }

      console.log('SessionService: Session found and validated for user:', user.email);
      return { session, user };
    } catch (error) {
      console.error('SessionService: Error getting safe session:', error);
      return { session: null, user: null };
    }
  }
}