import type { Database } from '../../../database.types';

/**
 * Represents a user profile from the database
 */
export type User = Database['public']['Tables']['profiles']['Row'];

/**
 * Data required to insert a new user profile
 */
export type UserInsert = Database['public']['Tables']['profiles']['Insert'];

/**
 * Fields allowed for updating a user profile
 */
export type UserUpdate = Database['public']['Tables']['profiles']['Update'];
