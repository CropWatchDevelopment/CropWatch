import type { SoilData } from '../models/SoilData';

/**
 * Data Transfer Object for soil data
 */
export interface SoilDataDto {
  /**
   * The device EUI that recorded this soil data
   */
  devEui: string;
  
  /**
   * Timestamp when the data was recorded
   */
  timestamp: string;
  
  /**
   * Soil temperature in Celsius
   */
  temperature?: number | null;
  
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
}

/**
 * Convert a soil data entity to a DTO
 * @param soilData The soil data entity to convert
 */
export function toSoilDataDto(soilData: SoilData): SoilDataDto {
  return {
    devEui: soilData.dev_eui,
    timestamp: soilData.created_at,
    temperature: soilData.temperature_c,
    moisture: soilData.moisture,
    ec: soilData.ec,
    ph: soilData.ph
  };
}

/**
 * Convert multiple soil data entities to DTOs
 * @param soilDataArray Array of soil data entities
 */
export function toSoilDataDtos(soilDataArray: SoilData[]): SoilDataDto[] {
  return soilDataArray.map(toSoilDataDto);
}