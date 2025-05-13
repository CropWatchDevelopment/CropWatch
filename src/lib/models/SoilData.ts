import type { Database } from '../../../database.types';

/**
 * SoilData model representing soil sensor data from the cw_soil_data table
 */
export interface SoilData {
  /**
   * The device EUI that recorded this soil data
   */
  dev_eui: string;
  
  /**
   * Soil temperature in Celsius
   */
  temperature_c?: number | null;
  
  /**
   * Soil moisture percentage
   */
  moisture?: number | null;
  
  /**
   * Soil electrical conductivity
   */
  ec?: number | null;
  
  /**
   * Soil pH level
   */
  ph?: number | null;
  
  /**
   * Timestamp when the data was recorded
   */
  created_at: string;
}

/**
 * Data required to insert new soil data
 */
export type SoilDataInsert = Omit<SoilData, 'created_at'>;

/**
 * Type for updating existing soil data
 */
export type SoilDataUpdate = Database['public']['Tables']['cw_soil_data']['Update'];