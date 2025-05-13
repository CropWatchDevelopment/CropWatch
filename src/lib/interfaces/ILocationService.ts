import type { Location, LocationInsert, LocationUpdate } from '../models/Location';

/**
 * Service interface for location operations
 */
export interface ILocationService {
  /**
   * Get a location by its ID
   * @param locationId The location ID
   */
  getLocationById(locationId: number): Promise<Location | null>;
  
  /**
   * Get all locations
   */
  getAllLocations(): Promise<Location[]>;
  
  /**
   * Get locations by owner ID
   * @param ownerId The owner ID
   */
  getLocationsByOwner(ownerId: string): Promise<Location[]>;
  
  /**
   * Create a new location
   * @param location The location to create
   */
  createLocation(location: LocationInsert): Promise<Location>;
  
  /**
   * Update an existing location
   * @param locationId The location ID
   * @param location The location with updated values
   */
  updateLocation(locationId: number, location: LocationUpdate): Promise<Location | null>;
  
  /**
   * Delete a location
   * @param locationId The location ID
   */
  deleteLocation(locationId: number): Promise<boolean>;

  /**
   * Get the count of devices for a specific location
   * @param locationId The location ID
   */
  getDeviceCountForLocation(locationId: number): Promise<number>;
}