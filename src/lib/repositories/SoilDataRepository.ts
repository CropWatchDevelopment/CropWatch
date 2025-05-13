import { inject, injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { SoilData, SoilDataInsert } from '../models/SoilData';
import { TYPES } from '../server/ioc.types';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for soil data access
 */
@injectable()
export class SoilDataRepository extends BaseRepository<SoilData, string> {
  protected tableName = 'cw_soil_data';
  protected primaryKey = 'dev_eui';
  protected entityName = 'SoilData';

  /**
   * Constructor with Supabase client and error handler dependencies
   */
  constructor(
    @inject(TYPES.SupabaseClient) supabase: SupabaseClient,
    @inject(ErrorHandlingService) errorHandler: ErrorHandlingService
  ) {
    super(supabase, errorHandler);
  }

  /**
   * Find soil data by device EUI
   * @param devEui The device EUI
   */
  async findByDeviceEui(devEui: string): Promise<SoilData[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .order('created_at', { ascending: false });
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding soil data by device EUI: ${devEui}`
      );
    }
    
    return data as SoilData[] || [];
  }

  /**
   * Find latest soil data for a device
   * @param devEui The device EUI
   */
  async findLatestByDeviceEui(devEui: string): Promise<SoilData | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      // For "no rows found" error, just return null
      if (error.code === 'PGRST116') {
        return null;
      }
      
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding latest soil data by device EUI: ${devEui}`
      );
    }
    
    return data as SoilData;
  }

  /**
   * Find soil data within a date range
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  async findByDateRange(devEui: string, startDate: Date, endDate: Date): Promise<SoilData[]> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error finding soil data by date range for device EUI: ${devEui}`
      );
    }
    
    return data as SoilData[] || [];
  }

  /**
   * Create new soil data
   * @param soilData The soil data to create
   */
  async create(soilData: SoilDataInsert): Promise<SoilData> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(soilData)
      .select()
      .single();
      
    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        'Error creating soil data'
      );
    }
    
    return data as SoilData;
  }
}