import type { Database } from '../../../database.types';

/**
 * Represents air data from the database
 */
export type AirData = Database['public']['Tables']['cw_air_data']['Row'];

/**
 * Type for creating new air data
 */
export type AirDataInsert = Database['public']['Tables']['cw_air_data']['Insert'];

/**
 * Type for updating existing air data
 */
export type AirDataUpdate = Database['public']['Tables']['cw_air_data']['Update'];