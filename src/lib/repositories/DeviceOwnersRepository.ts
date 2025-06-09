import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { DeviceOwner, DeviceOwnerInsert, DeviceOwnerUpdate, DeviceOwnerWithProfile } from '../models/DeviceOwner';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import { injectable, inject } from 'inversify';
import { TYPES } from '$lib/server/ioc.types';

/**
 * Repository for device owner data access
 */
@injectable()
export class DeviceOwnersRepository extends BaseRepository<DeviceOwner, number> {
  protected tableName = 'cw_device_owners';
  protected primaryKey = 'id';
  protected entityName = 'DeviceOwner';

  /**
   * Constructor with Supabase client and error handler dependencies
   */
  constructor(
    @inject(TYPES.SupabaseClient) supabase: SupabaseClient,
    @inject(TYPES.ErrorHandlingService) errorHandler: ErrorHandlingService
  ) {
    super(supabase, errorHandler);
  }

  /**
   * Find all device owners
   */
  async findAll(): Promise<DeviceOwner[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('id');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error finding all device owners'
      );
    }
    
    return data as DeviceOwner[] || [];
  }

  /**
   * Find device owners by device EUI
   * @param devEui The device EUI
   */
  async findByDeviceEui(devEui: string): Promise<DeviceOwner[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .order('id');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding device owners by device EUI: ${devEui}`
      );
    }
    
    return data as DeviceOwner[] || [];
  }

  /**
   * Find device owners by user ID
   * @param userId The user ID
   */
  async findByUserId(userId: string): Promise<DeviceOwner[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('id');
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding device owners by user ID: ${userId}`
      );
    }
    
    return data as DeviceOwner[] || [];
  }

  /**
   * Find device owners with profile information by device EUI
   * @param devEui The device EUI
   */
  async findWithProfilesByDeviceEui(devEui: string): Promise<DeviceOwnerWithProfile[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        profiles!user_id(
          id,
          full_name,
          email,
          username
        )
      `)
      .eq('dev_eui', devEui)
      .order('permission_level', { ascending: false });
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding device owners with profiles by device EUI: ${devEui}`
      );
    }
    
    // Transform the data to match our DeviceOwnerWithProfile interface
    const transformedData = data?.map(item => ({
      ...item,
      profile: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles
    })) as DeviceOwnerWithProfile[] || [];
    
    return transformedData;
  }

  /**
   * Find a specific device owner entry
   * @param devEui The device EUI
   * @param userId The user ID
   */
  async findByDeviceAndUser(devEui: string, userId: string): Promise<DeviceOwner | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      // Don't log error for "not found" cases as they might be expected
      if (error.code !== 'PGRST116') {
        this.errorHandler.handleDatabaseError(
          error,
          `Error finding device owner by device EUI ${devEui} and user ID ${userId}`
        );
      }
      return null;
    }
    
    return data as DeviceOwner;
  }

  /**
   * Check if a user has permission for a device
   * @param devEui The device EUI
   * @param userId The user ID
   * @param minimumPermission The minimum permission level required (optional)
   */
  async hasPermission(devEui: string, userId: string, minimumPermission?: number): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('permission_level')
      .eq('dev_eui', devEui)
      .eq('user_id', userId)
      .single();
      
    if (error || !data) {
      return false;
    }
    
    if (minimumPermission !== undefined) {
      // Lower numbers = higher permissions (1=Admin, 2=Editor, 3=Viewer)
      return data.permission_level <= minimumPermission;
    }
    
    return true;
  }

  /**
   * Get devices owned by a user
   * @param userId The user ID
   */
  async getDevicesByUserId(userId: string): Promise<DeviceOwner[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        cw_devices!dev_eui(
          dev_eui,
          name,
          description,
          location_id
        )
      `)
      .eq('user_id', userId)
      .order('permission_level', { ascending: false });
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding devices by user ID: ${userId}`
      );
    }
    
    return data as DeviceOwner[] || [];
  }

  /**
   * Create a new device owner entry
   * @param deviceOwner The device owner data to insert
   */
  async create(deviceOwner: DeviceOwnerInsert): Promise<DeviceOwner | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(deviceOwner)
      .select()
      .single();
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error creating device owner'
      );
    }
    
    return data as DeviceOwner;
  }

  /**
   * Update a device owner entry
   * @param id The device owner ID
   * @param updates The updates to apply
   */
  async update(id: number, updates: DeviceOwnerUpdate): Promise<DeviceOwner | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updates)
      .eq(this.primaryKey, id)
      .select()
      .single();
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error updating device owner with ID: ${id}`
      );
    }
    
    return data as DeviceOwner;
  }

  /**
   * Delete a device owner entry
   * @param id The device owner ID
   */
  async delete(id: number): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq(this.primaryKey, id);
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error deleting device owner with ID: ${id}`
      );
    }
  }

  /**
   * Delete device owner entries by device EUI and user ID
   * @param devEui The device EUI
   * @param userId The user ID
   */
  async deleteByDeviceAndUser(devEui: string, userId: string): Promise<void> {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('dev_eui', devEui)
      .eq('user_id', userId);
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error deleting device owner by device EUI ${devEui} and user ID ${userId}`
      );
    }
  }

  /**
   * Update permission level for a device owner
   * @param id The device owner ID
   * @param permissionLevel The new permission level
   */
  async updatePermission(id: number, permissionLevel: number): Promise<DeviceOwner | null> {
    return this.update(id, { permission_level: permissionLevel });
  }
}
