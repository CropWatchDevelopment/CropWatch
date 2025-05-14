import type { ILocationService } from '../interfaces/ILocationService';
import { LocationRepository } from '../repositories/LocationRepository';
import type { Location, LocationInsert, LocationUpdate } from '../models/Location';
import type { LocationUser } from '../models/LocationUser';
import { DeviceRepository } from '../repositories/DeviceRepository';
import { injectable, inject } from 'inversify';
import { TYPES } from '$lib/server/ioc.types';
import { AppError } from '$lib/errors/AppError';

/**
 * Implementation of LocationService
 * This service handles all business logic related to locations
 */
@injectable()
export class LocationService implements ILocationService {
  /**
   * Constructor with repository dependencies
   */
  constructor(
    @inject(TYPES.LocationRepository) private locationRepository: LocationRepository,
    @inject(TYPES.DeviceRepository) private deviceRepository: DeviceRepository
  ) {
    console.log('starting location service...');
  }

  /**
   * Get a location by its ID
   * @param locationId The location ID
   */
  async getLocationById(locationId: number): Promise<Location | null> {
    return this.locationRepository.findById(locationId);
  }
  
  /**
   * Get all locations
   */
  async getAllLocations(): Promise<Location[]> {
    return this.locationRepository.findAll();
  }
  
  /**
   * Get locations by owner ID
   * @param ownerId The owner ID
   */
  async getLocationsByOwner(ownerId: string): Promise<Location[]> {
    return this.locationRepository.findByOwnerId(ownerId);
  }
  
  /**
   * Create a new location
   * @param location The location to create
   */
  async createLocation(location: LocationInsert): Promise<Location> {
    return this.locationRepository.create(location);
  }
  
  /**
   * Update an existing location
   * @param locationId The location ID
   * @param location The location with updated values
   */
  async updateLocation(locationId: number, location: LocationUpdate): Promise<Location | null> {
    return this.locationRepository.update(locationId, location);
  }
  
  /**
   * Delete a location
   * @param locationId The location ID
   */
  async deleteLocation(locationId: number): Promise<boolean> {
    return this.locationRepository.delete(locationId);
  }
  
  /**
   * Get the count of devices for a specific location
   * @param locationId The location ID
   */
  async getDeviceCountForLocation(locationId: number): Promise<number> {
    const devices = await this.deviceRepository.findByLocation(locationId);
    return devices.length;
  }
  
  /**
   * Get all users with access to a location
   * @param locationId The location ID
   */
  async getLocationUsers(locationId: number): Promise<LocationUser[]> {
    return this.locationRepository.getLocationUsers(locationId);
  }
  
  /**
   * Check if a user has sufficient permissions to access a location
   * @param locationId The location ID
   * @param userId The user ID
   * @param requiredLevel The minimum required permission level (defaults to 3 - Viewer)
   */
  async checkUserLocationPermission(locationId: number, userId: string, requiredLevel: number = 3): Promise<boolean> {
    return this.locationRepository.checkUserPermission(locationId, userId, requiredLevel);
  }
  
  /**
   * Add a user to a location with specified permission level
   * @param locationId The location ID
   * @param email The email of the user to add
   * @param permissionLevel The permission level to assign
   * @param applyToDevices Whether to apply the same permission to all devices in the location
   */
  async addUserToLocation(
    locationId: number, 
    email: string, 
    permissionLevel: number, 
    applyToDevices: boolean
  ): Promise<{ success: boolean; error?: string; warning?: string; }> {
    try {
      // First, find the user by email
      const userToAdd = await this.locationRepository.findUserByEmail(email);
      
      if (!userToAdd) {
        return { success: false, error: 'User not found' };
      }
      
      // Check if the user already has permissions for this location
      const existingPerm = await this.locationRepository.findLocationOwner(locationId, userToAdd.id);
      
      if (existingPerm) {
        return { success: false, error: 'User already has permissions for this location' };
      }
      
      // Add user to location
      await this.locationRepository.addUserToLocation(locationId, userToAdd.id, permissionLevel);
      
      // If applyToDevices is true, apply the same permission to all devices in the location
      const devices = await this.deviceRepository.findByLocation(locationId);
      
      if (!devices || devices.length === 0) {
        return { success: true };
      }
      
      if (applyToDevices) {
        // Add user to all devices with the same permission level
        await Promise.all(
          devices.map(device => 
            this.deviceRepository.addUserToDevice(device.dev_eui, userToAdd.id, permissionLevel)
          )
        );
      } else {
        // Add user to all devices with 'Disabled' permission (level 4)
        await Promise.all(
          devices.map(device => 
            this.deviceRepository.addUserToDevice(device.dev_eui, userToAdd.id, 4)
          )
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error adding user to location:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to add user to location' 
      };
    }
  }
  
  /**
   * Update a user's permission for a location
   * @param locationId The location ID
   * @param userId The user ID to update
   * @param locationOwnerId The location owner entry ID
   * @param permissionLevel The new permission level
   * @param applyToDevices Whether to apply the same permission to all devices in the location
   */
  async updateUserPermission(
    locationId: number,
    userId: string,
    locationOwnerId: number,
    permissionLevel: number,
    applyToDevices: boolean
  ): Promise<{ success: boolean; error?: string; warning?: string; }> {
    try {
      // Update user's location permission
      await this.locationRepository.updateUserPermission(locationOwnerId, permissionLevel);
      
      // If applyToDevices is true, update all device permissions for this user
      if (applyToDevices) {
        // Get all devices in this location
        const devices = await this.deviceRepository.findByLocation(locationId);
        
        if (!devices || devices.length === 0) {
          return { success: true };
        }
        
        await Promise.all(
          devices.map(async (device) => {
            // Check if user has existing permission for this device
            const existingPermission = await this.deviceRepository.findDeviceOwner(device.dev_eui, userId);
            
            if (existingPermission) {
              // Update existing permission
              await this.deviceRepository.updateDevicePermission(existingPermission.id, permissionLevel);
            } else {
              // Create new permission
              await this.deviceRepository.addUserToDevice(device.dev_eui, userId, permissionLevel);
            }
          })
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user permission:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update permission' 
      };
    }
  }
  
  /**
   * Remove a user from a location and its devices
   * @param locationId The location ID
   * @param userId The user ID to remove
   * @param locationOwnerId The location owner entry ID
   */
  async removeUserFromLocation(
    locationId: number,
    userId: string,
    locationOwnerId: number
  ): Promise<{ success: boolean; error?: string; }> {
    try {
      // Check if user is attempting to remove themselves as admin
      const userPermission = await this.locationRepository.getLocationOwnerById(locationOwnerId);
      
      if (userPermission?.permission_level === 1) {
        // Get count of other admins
        const otherAdmins = await this.locationRepository.countOtherAdmins(locationId, userId);
        
        if (otherAdmins === 0) {
          return { 
            success: false, 
            error: 'Cannot remove yourself as admin. Assign another admin first.' 
          };
        }
      }
      
      // Delete user from location
      await this.locationRepository.removeUserFromLocation(locationOwnerId);
      
      // Get all devices in this location to remove user from device permissions
      const devices = await this.deviceRepository.findByLocation(locationId);
      
      if (devices && devices.length > 0) {
        await Promise.all(
          devices.map(device => 
            this.deviceRepository.removeUserFromDevice(device.dev_eui, userId)
          )
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error removing user from location:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove user from location' 
      };
    }
  }
}