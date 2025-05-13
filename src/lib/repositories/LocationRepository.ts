import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Location, LocationInsert, LocationUpdate } from '../models/Location';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for location data access
 */
export class LocationRepository extends BaseRepository<Location, number> {
  protected tableName = 'cw_locations';
  protected primaryKey = 'location_id';
  protected entityName = 'Location';

  /**
   * Constructor with Supabase client and error handler dependencies
   */
  constructor(
    supabase: SupabaseClient,
    errorHandler: ErrorHandlingService
  ) {
    super(supabase, errorHandler);
  }
  
  /**
   * Find all locations
   */
  async findAll(): Promise<Location[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('name');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error finding all locations'
      );
    }
    
    return data as Location[] || [];
  }

  /**
   * Find locations by owner ID
   * @param ownerId The owner ID
   */
  async findByOwnerId(ownerId: string): Promise<Location[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('owner_id', ownerId)
      .order('name');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding locations by owner ID: ${ownerId}`
      );
    }
    
    return data as Location[] || [];
  }

  /**
   * Create a new location
   * @param location The location to create
   */
  async create(location: LocationInsert): Promise<Location> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(location)
      .select()
      .single();
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error creating location'
      );
    }
    
    return data as Location;
  }

  /**
   * Update an existing location
   * @param id The location ID
   * @param location The location with updated values
   */
  async update(id: number, location: LocationUpdate): Promise<Location | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(location)
      .eq(this.primaryKey, id)
      .select()
      .single();
      
    if (error) {
      // For "no rows found" error, return null
      if (error.code === 'PGRST116') {
        return null;
      }
      
      this.errorHandler.handleDatabaseError(
        error,
        `Error updating location with ID: ${id}`
      );
    }
    
    return data as Location;
  }
}