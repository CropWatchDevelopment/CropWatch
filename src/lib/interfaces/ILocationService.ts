import type { Location, LocationInsert, LocationUpdate } from '../models/Location';
import type { LocationUser } from '../models/LocationUser';

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
  
  /**
   * Get all users with access to a location
   * @param locationId The location ID
   */
  getLocationUsers(locationId: number): Promise<LocationUser[]>;
  
  /**
   * Check if a user has sufficient permissions to access a location
   * @param locationId The location ID
   * @param userId The user ID
   * @param requiredLevel The minimum required permission level (defaults to 3 - Viewer)
   */
  checkUserLocationPermission(locationId: number, userId: string, requiredLevel?: number): Promise<boolean>;
  
  /**
   * Add a user to a location with specified permission level
   * @param locationId The location ID
   * @param email The email of the user to add
   * @param permissionLevel The permission level to assign
   * @param applyToDevices Whether to apply the same permission to all devices in the location
   */
  addUserToLocation(
    locationId: number, 
    email: string, 
    permissionLevel: number, 
    applyToDevices: boolean
  ): Promise<{ success: boolean; error?: string; warning?: string; }>;
  
  /**
   * Update a user's permission for a location
   * @param locationId The location ID
   * @param userId The user ID to update
   * @param locationOwnerId The location owner entry ID
   * @param permissionLevel The new permission level
   * @param applyToDevices Whether to apply the same permission to all devices in the location
   */
  updateUserPermission(
    locationId: number,
    userId: string,
    locationOwnerId: number,
    permissionLevel: number,
    applyToDevices: boolean
  ): Promise<{ success: boolean; error?: string; warning?: string; }>;
  
  /**
   * Remove a user from a location and its devices
   * @param locationId The location ID
   * @param userId The user ID to remove
   * @param locationOwnerId The location owner entry ID
   */
  removeUserFromLocation(
    locationId: number,
    userId: string,
    locationOwnerId: number
  ): Promise<{ success: boolean; error?: string; }>;
}