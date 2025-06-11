import { inject, injectable } from 'inversify';
import type { SupabaseClient } from '@supabase/supabase-js';
import { TYPES } from '$lib/server/ioc.types';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for querying dynamic device data tables.
 */
@injectable()
export class DeviceDataRepository {
  constructor(
    @inject(TYPES.SupabaseClient) private supabase: SupabaseClient,
    @inject(TYPES.ErrorHandlingService) private errorHandler: ErrorHandlingService
  ) {}

  /**
   * Get the latest row for a device from the specified table.
   * @param tableName The table to query
   * @param devEui The device EUI
   */
  async findLatestByDeviceEui<T extends Record<string, unknown>>(tableName: string, devEui: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from<T>(tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error fetching latest data from ${tableName} for device ${devEui}`
      );
    }

    return data as T;
  }

  /**
   * Get device data within the specified date range from the table.
   * @param tableName The table to query
   * @param devEui The device EUI
   * @param startDate Start of range
   * @param endDate End of range
   */
  async findByDateRange<T extends Record<string, unknown>>(
    tableName: string,
    devEui: string,
    startDate: Date,
    endDate: Date
  ): Promise<T[]> {
    const { data, error } = await this.supabase
      .from<T>(tableName)
      .select('*')
      .eq('dev_eui', devEui)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      this.errorHandler.handleDatabaseError(
        error,
        `Error fetching data from ${tableName} for device ${devEui}`
      );
    }

    return (data as T[]) || [];
  }
}
