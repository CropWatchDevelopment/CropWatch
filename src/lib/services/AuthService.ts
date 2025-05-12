import type { SignInWithPasswordCredentials, SupabaseClient } from '@supabase/supabase-js';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { IAuthService } from '../interfaces/IAuthService';

/**
 * Implementation of AuthService using Supabase
 * This service handles user authentication operations
 */
export class AuthService implements IAuthService {
  /**
   * Constructor with SupabaseClient dependency
   */
  constructor(
    private supabase: SupabaseClient,
    private errorHandler: ErrorHandlingService
  ) { }

  /**
   * Sign in with email and password using Supabase Auth
   * @param email User email
   * @param password User password
   * @returns Promise with the session or null if authentication failed
   */
  async signInWithPassword(email: string, password: string): Promise<{ user: any; session: any } | null> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        this.errorHandler.logError(error);
        return null;
      }

      return data;
    } catch (error) {
      this.errorHandler.logError(error as Error);
      return null;
    }
  }

  /**
   * Sign out the current user
   * @returns Promise indicating success
   */
  async signOut(): Promise<void> {
    try {
      // Use local scope to ensure we only sign out the current browser session
      const { error } = await this.supabase.auth.signOut({
        scope: 'local', // Only sign out the current browser session
        
      });

      if (error) {
        this.errorHandler.logError(error);
      }
    } catch (error) {
      this.errorHandler.logError(error as Error);
    }
  }

  /**
   * Get the current session
   * @returns Promise with the session or null if not authenticated
   */
  async getSession(): Promise<{ user: any; session: any } | null> {
    try {
      const { data, error } = await this.supabase.auth.getSession();

      if (error) {
        this.errorHandler.logError(error);
        return null;
      }

      return data.session ? { user: data.session.user, session: data.session } : null;
    } catch (error) {
      this.errorHandler.logError(error as Error);
      return null;
    }
  }

  /**
   * Register a new user with Supabase Auth and store profile data
   * @param userData User registration data including email, password, and profile
   * @returns Promise with success status and error message if applicable
   */
  async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    company: string;
  }): Promise<{ 
    success: boolean; 
    error?: string;
    emailConfirmationRequired?: boolean;
  }> {
    try {
      // Create user account with Supabase Auth
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            company: userData.company,
            full_name: `${userData.firstName} ${userData.lastName}`
          }
        }
      });

      if (authError) {
        this.errorHandler.logError(authError);
        return {
          success: false,
          error: authError.message
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'User registration failed'
        };
      }

      // Check if email confirmation is required
      const emailConfirmationRequired = !authData.user.email_confirmed_at;
      
      return {
        success: true,
        emailConfirmationRequired,
        error: emailConfirmationRequired ? 
          'Please check your email to confirm your account before logging in' : 
          undefined
      };
    } catch (error) {
      this.errorHandler.logError(error as Error);
      return {
        success: false,
        error: 'An unexpected error occurred during registration'
      };
    }
  }

  /**
   * Sends password reset email to the provided email address
   * @param email Email address to send password reset link to
   * @returns Promise with success status and error message if applicable
   */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${this.getRedirectUrl()}/auth/reset-password`
      });

      if (error) {
        this.errorHandler.logError(error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      this.errorHandler.logError(err as Error);
      return { success: false, error: 'Failed to send password reset email' };
    }
  }

  /**
   * Updates the user password after reset
   * @param newPassword New password to set
   * @returns Promise with success status and error message if applicable
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        this.errorHandler.logError(error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      this.errorHandler.logError(err as Error);
      return { success: false, error: 'Failed to update password' };
    }
  }

  /**
   * Gets the redirect URL based on the environment
   * @returns The base URL for redirects
   */
  private getRedirectUrl(): string {
    // If running in a browser, use the current origin
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    
    // Otherwise use environment variables or a default
    return process.env.PUBLIC_SITE_URL || 'https://cropwatch.io';
  }
}