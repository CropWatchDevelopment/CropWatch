/**
 * Service interface for authentication operations
 */
export interface IAuthService {
  /**
   * Sign in with email and password
   * @param email User email
   * @param password User password
   * @returns Promise with the session or null if authentication failed
   */
  signInWithPassword(email: string, password: string): Promise<{ user: any; session: any } | null>;
  
  /**
   * Sign out the current user
   * @returns Promise indicating success
   */
  signOut(): Promise<void>;
  
  /**
   * Get the current session
   * @returns Promise with the session or null if not authenticated
   */
  getSession(): Promise<{ user: any; session: any } | null>;

  /**
   * Register a new user
   * @param userData User registration data including email, password, and profile information
   * @returns Promise with the registration result
   */
  register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    company: string;
  }): Promise<{ 
    success: boolean; 
    error?: string;
    emailConfirmationRequired?: boolean;
  }>;
  
  /**
   * Send password reset email to user
   * @param email Email address to send reset link to
   * @returns Promise with success status and any error message
   */
  resetPassword(email: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Update user password after reset
   * @param newPassword New password to set
   * @returns Promise with success status and any error message
   */
  updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }>;
}