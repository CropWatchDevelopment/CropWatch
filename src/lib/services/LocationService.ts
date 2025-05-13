import type { ILocationService } from '../interfaces/ILocationService';
import { LocationRepository } from '../repositories/LocationRepository';
import type { Location, LocationInsert, LocationUpdate } from '../models/Location';
import { DeviceRepository } from '../repositories/DeviceRepository';

/**
 * Implementation of LocationService
 * This service handles all business logic related to locations
 */
export class LocationService implements ILocationService {
  /**
   * Constructor with repository dependencies
   */
  constructor(
    private locationRepository: LocationRepository,
    private deviceRepository: DeviceRepository
  ) {}

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
}