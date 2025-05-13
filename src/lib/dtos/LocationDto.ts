import type { Location } from '../models/Location';

/**
 * Data Transfer Object for location data
 */
export interface LocationDto {
  /**
   * Unique identifier for the location
   */
  id: number;
  
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
  latitude?: number | null;
  
  /**
   * Longitude coordinate
   */
  longitude?: number | null;
  
  /**
   * Owner ID of the location
   */
  ownerId?: string | null;
  
  /**
   * Timestamp when the location was created
   */
  createdAt: string;
  
  /**
   * Map zoom level for display purposes
   */
  mapZoom?: number | null;
}

/**
 * Convert a location entity to a DTO
 * @param location The location entity to convert
 */
export function toLocationDto(location: Location): LocationDto {
  return {
    id: location.location_id,
    name: location.name,
    description: location.description,
    latitude: location.lat,
    longitude: location.long,
    ownerId: location.owner_id,
    createdAt: location.created_at,
    mapZoom: location.map_zoom
  };
}

/**
 * Convert multiple location entities to DTOs
 * @param locations Array of location entities
 */
export function toLocationDtos(locations: Location[]): LocationDto[] {
  return locations.map(toLocationDto);
}