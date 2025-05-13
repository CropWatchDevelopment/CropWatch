import type { Database } from '../../../database.types';

/**
 * Location model representing locations from the cw_locations table
 */
export interface Location {
  /**
   * Unique identifier for the location
   */
  location_id: number;
  
  /**
   * Name of the location
   */
  name: string;
  
  /**
   * Optional description of the location
   */
  description?: string | null;
  
  /**
   * Latitude coordinate
   */
  lat?: number | null;
  
  /**
   * Longitude coordinate
   */
  long?: number | null;
  
  /**
   * Owner ID of the location
   */
  owner_id?: string | null;
  
  /**
   * Timestamp when the location was created
   */
  created_at: string;
  
  /**
   * Map zoom level for display purposes
   */
  map_zoom?: number | null;
}

/**
 * Data required to insert a new location
 */
export type LocationInsert = Omit<Location, 'location_id' | 'created_at'>;

/**
 * Type for updating existing location
 */
export type LocationUpdate = Partial<LocationInsert>;