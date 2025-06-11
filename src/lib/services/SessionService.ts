import type { ISessionService } from '../interfaces/ISessionService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Session, User } from '@supabase/supabase-js';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import { info, debug } from '../utilities/logger';

/**
 * Service for handling session-related operations
 * Refactored to accept a Supabase client directly instead of using IoC injection
 */
export class SessionService implements ISessionService {
  private supabaseClient: SupabaseClient;
  private readonly errorHandler = new ErrorHandlingService();

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
        debug('SessionService: No session found');
        return { session: null, user: null };
      }

      // Validate the JWT by getting the user
      const { data: { user }, error } = await this.supabaseClient.auth.getUser();
      
      if (error) {
        this.errorHandler.logError(error);
        return { session: null, user: null };
      }

      info('SessionService: Session found and validated for user:', user.email);
      return { session, user };
    } catch (error) {
      this.errorHandler.logError(error as Error);
      return { session: null, user: null };
    }
  }
}