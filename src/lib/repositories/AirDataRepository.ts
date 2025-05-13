import { inject, injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { AirData } from '../models/AirData';
import { TYPES } from '../server/ioc.types';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for air data access
 */
@injectable()
export class AirDataRepository extends BaseRepository<AirData, string> {
  protected tableName = 'cw_air_data';
  protected primaryKey = 'dev_eui';
  protected entityName = 'AirData';

  /**
   * Constructor with Supabase client dependency
   */
  constructor(
    @inject(TYPES.SupabaseClient) supabase: SupabaseClient,
    @inject(ErrorHandlingService) errorHandler: ErrorHandlingService
  ) {
    super(supabase, errorHandler);
  }

  /**
   * Find air data by device EUI
   * @param devEui The device EUI
   */
  async findByDeviceEui(devEui: string): Promise<AirData[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .order('created_at', { ascending: false });
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding air data by device EUI: ${devEui}`
      );
    }
    
    return data as AirData[] || [];
  }

  /**
   * Find latest air data for a device
   * @param devEui The device EUI
   */
  async findLatestByDeviceEui(devEui: string): Promise<AirData | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding latest air data by device EUI: ${devEui}`
      );
    }
    
    return data as AirData;
  }

  /**
   * Find air data by date range
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  async findByDateRange(devEui: string, startDate: Date, endDate: Date): Promise<AirData[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: true });
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding air data by date range for device: ${devEui}`
      );
    }
    
    return data as AirData[] || [];
  }
}