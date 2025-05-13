import type { SupabaseClient, QueryData } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Device, DeviceWithType, DeviceLocation } from '../models/Device';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { Database } from '../../../database.types';

/**
 * Type for device with joined location and device type data
 */
export type DeviceWithJoins = Device & {
  cw_device_type: Database['public']['Tables']['cw_device_type']['Row'];
  cw_locations: (DeviceLocation & {
    cw_location_owners: Database['public']['Tables']['cw_location_owners']['Row'][];
  })[];
};

/**
 * Repository for device data access
 */
export class DeviceRepository extends BaseRepository<Device, string> {
  protected tableName = 'cw_devices';
  protected primaryKey = 'dev_eui';
  protected entityName = 'Device';

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
   * Get a device with its type information
   * @param devEui The device EUI
   */
  async getDeviceWithType(devEui: string): Promise<DeviceWithType | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        cw_device_type(*)
      `)
      .eq(this.primaryKey, devEui)
      .single();

    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding device with type by EUI: ${devEui}`
      );
    }

    return data as DeviceWithType;
  }

  /**
   * Get devices by location ID
   * @param locationId The location ID
   */
  async findByLocation(locationId: number): Promise<DeviceWithJoins[]> {
    const session = await this.supabase.auth.getSession();
    
    // Define the query with proper typing
    const query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        cw_device_type(*),
        cw_locations(*, cw_location_owners(*))
      `)
      .eq('location_id', locationId)
      .eq('cw_locations.cw_location_owners.user_id', session.data.session?.user.id);
    
    const { data, error } = await query;

    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding devices by location: ${locationId}`
      );
    }

    return data as DeviceWithJoins[] || [];
  }

  /**
   * Get devices by type ID
   * @param typeId The device type ID
   */
  async findByType(typeId: number): Promise<Device[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('type', typeId);

    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding devices by type: ${typeId}`
      );
    }

    return data as Device[] || [];
  }
}