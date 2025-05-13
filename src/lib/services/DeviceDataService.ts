import type { IDeviceDataService } from '../interfaces/IDeviceDataService';
import type { DeviceType } from '../models/Device';
import type { SupabaseClient } from '@supabase/supabase-js';

export class DeviceDataService implements IDeviceDataService {
  // List of known large tables that require special handling
  private readonly LARGE_TABLES = ['cw_air_data', 'cw_air_data_hpy', 'cw_soil_data', 'cw_soil_data_hpy'];

  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Checks if a table is known to be large and require special handling
   */
  private isLargeTable(tableName: string): boolean {
    return this.LARGE_TABLES.includes(tableName);
  }

  /**
   * Get the latest data for a device based on its type, with optimized handling for large tables
   * @param devEui The device EUI
   * @param deviceType The device type information containing data_table_v2
   */
  async getLatestDeviceData(devEui: string, deviceType: DeviceType): Promise<any> {
    if (!deviceType || !deviceType.data_table_v2) {
      throw new Error('Device type or data table not specified');
    }

    const tableName = deviceType.data_table_v2;

    try {
      // Use different strategies based on table size
      if (this.isLargeTable(tableName)) {
        console.log(`Using optimized query for large table ${tableName} and device ${devEui}`);

        // Get table structure first to determine available columns
        const { data: columns, error } = await this.supabase
          .from(tableName)
          .select()
          .eq('dev_eui', devEui)
          .order('created_at', { ascending: false })
          .limit(1);

        // Select only essential columns instead of all to improve performance
        // This is a common technique to reduce query time and memory usage
        const essentialColumns = ['created_at', 'dev_eui'];

        // Add primary data columns if they exist (based on device type definition)
        if (deviceType.primary_data_v2) {
          essentialColumns.push(deviceType.primary_data_v2);
        }
        if (deviceType.secondary_data_v2) {
          essentialColumns.push(deviceType.secondary_data_v2);
        }

        // Add some commonly used columns that might be valuable
        ['temperature_c', 'humidity', 'co2', 'battery_level', 'moisture', 'ec', 'ph'].forEach(col => {
          if (columns && columns.length > 0 && columns[0][col] !== undefined) {
            essentialColumns.push(col);
          }
        });

        // For large tables, use a more optimized query with only essential columns
        const { data, error: dataError } = await this.supabase
          .from(tableName)
          .select(essentialColumns.join(','))
          .eq('dev_eui', devEui)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (dataError) {
          if (dataError.code === 'PGRST116') {
            return null; // No data found
          }

          // Try a fallback query with minimal columns
          console.log(`Fallback to simple query for ${tableName} and device ${devEui}`);
          try {
            const { data: fallbackData, error: fallbackError } = await this.supabase
              .from(tableName)
              .select('created_at, dev_eui')
              .eq('dev_eui', devEui)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (!fallbackError) {
              return {
                ...fallbackData,
                partial: true,
                note: 'Limited data available due to performance constraints'
              };
            }
          } catch (fallbackError) {
            console.error(`Fallback query also failed for ${tableName}:`, fallbackError);
          }

          throw new Error(`Error fetching device data: ${dataError.message}`);
        }

        return data;
      } else {
        // For smaller tables, use the standard query approach
        const { data, error } = await this.supabase
          .from(tableName)
          .select()
          .eq('dev_eui', devEui)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // No data found
          }
          throw new Error(`Error fetching device data: ${error.message}`);
        }

        return data;
      }
    } catch (error) {
      // Handle errors with a generic response
      console.error(`Error in getLatestDeviceData for ${devEui} in table ${tableName}:`, error);
      
      if (error instanceof Error && error.message.includes('AbortError')) {
        return {
          error: 'Data retrieval timed out',
          partial: true,
          dev_eui: devEui,
          created_at: new Date().toISOString(),
          note: 'This is a placeholder due to query timeout'
        };
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Get device data within a date range based on device type
   * @param devEui The device EUI
   * @param deviceType The device type information containing data_table_v2
   * @param startDate The start date
   * @param endDate The end date
   */
  async getDeviceDataByDateRange(devEui: string, deviceType: DeviceType, startDate: Date, endDate: Date): Promise<any[]> {
    if (!deviceType || !deviceType.data_table_v2) {
      throw new Error('Device type or data table not specified');
    }

    const tableName = deviceType.data_table_v2;

    try {
      // Use different strategies based on table size
      if (this.isLargeTable(tableName)) {
        console.log(`Using optimized date range query for large table ${tableName} and device ${devEui}`);

        // For large tables, use a more targeted approach with only essential columns
        const essentialColumns = ['created_at', 'dev_eui'];

        // Add primary data columns
        if (deviceType.primary_data_v2) {
          essentialColumns.push(deviceType.primary_data_v2);
        }
        if (deviceType.secondary_data_v2) {
          essentialColumns.push(deviceType.secondary_data_v2);
        }

        // For large tables, use a more optimized query with only essential columns
        const { data, error } = await this.supabase
          .from(tableName)
          .select(essentialColumns.join(','))
          .eq('dev_eui', devEui)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(50); // Limit to a reasonable number for large tables

        if (error) {
          // Try a fallback query with minimal columns and fewer records
          console.log(`Fallback to simple date range query for ${tableName} and device ${devEui}`);
          try {
            const { data: fallbackData, error: fallbackError } = await this.supabase
              .from(tableName)
              .select('created_at, dev_eui')
              .eq('dev_eui', devEui)
              .order('created_at', { ascending: false })
              .limit(5);

            if (!fallbackError && fallbackData) {
              return fallbackData.map((item: any) => ({
                ...item,
                partial: true,
                note: 'Limited data available due to performance constraints'
              }));
            }
          } catch (fallbackError) {
            console.error(`Fallback date range query also failed for ${tableName}:`, fallbackError);
          }

          throw new Error(`Error fetching device data: ${error.message}`);
        }

        return data || [];
      } else {
        // For smaller tables, use the standard approach
        const { data, error } = await this.supabase
          .from(tableName)
          .select()
          .eq('dev_eui', devEui)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(100); // Limit to a reasonable number of records

        if (error) {
          throw new Error(`Error fetching device data: ${error.message}`);
        }

        return data || [];
      }
    } catch (error) {
      // Handle errors with a generic response
      console.error(`Error in getDeviceDataByDateRange for ${devEui} in table ${tableName}:`, error);
      
      if (error instanceof Error && error.message.includes('AbortError')) {
        return [{
          error: 'Data retrieval timed out',
          partial: true,
          dev_eui: devEui,
          created_at: new Date().toISOString(),
          note: 'This is a placeholder due to query timeout'
        }];
      }

      // Re-throw other errors
      throw error;
    }
  }
}