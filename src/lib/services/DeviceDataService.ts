import moment from 'moment';
import type { IDeviceDataService } from '../interfaces/IDeviceDataService';
import type { DeviceType } from '../models/Device';
import type { SupabaseClient } from '@supabase/supabase-js';

export class DeviceDataService implements IDeviceDataService {

  constructor(private readonly supabase: SupabaseClient) { }

  /**
   * Get the latest data for a device based on its type, with optimized handling for large tables
   * @param devEui The device EUI
   * @param deviceType The device type information containing data_table_v2
   */
  public async getLatestDeviceData(devEui: string): Promise<any> {
    if (!devEui) {
      throw new Error('Device EUI not specified');
    }

    const cw_device = await this.getDeviceAndType(devEui);
    const tableName = cw_device.cw_device_type.data_table_v2; // Pull out the table name

    try {
      const { data, error } = await this.supabase
        .from(tableName)
        .select()
        .eq('dev_eui', devEui)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error(`Error fetching columns for ${tableName}:`, error);
        throw new Error(`Error fetching columns: ${error.message}`);
      }

      return data;
    } catch (error) {
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
      throw error;
    }
  }

  /**
   * Get device data within a date range based on device type
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  public async getDeviceDataByDateRange(devEui: string, startDate: Date, endDate: Date): Promise<any[]> {
    if (!devEui) {
      throw new Error('Device EUI not specified');
    }
    if (!startDate || !endDate) {
      throw new Error('Start date and end date must be specified');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    const cw_device = await this.getDeviceAndType(devEui);
    const tableName = cw_device.cw_device_type.data_table_v2; // Pull out the table name

    try {
      // Calculate the date range differences for aggregation strategy
      const daysInRange = moment(endDate).diff(startDate, 'days');
      const monthsInRange = moment(endDate).diff(startDate, 'months');
      const yearsInRange = moment(endDate).diff(startDate, 'years');

      // Check if the range is too large (more than 3 months)
      if (monthsInRange > 3) {
        throw new Error('Date range too large');
      }

      let query = this.supabase
        .from(tableName)
        .select('*')
        .eq('dev_eui', devEui)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // For small ranges (≤ 1 day), return all data points without aggregation
      if (daysInRange <= 1) {
        query = query.order('created_at', { ascending: false });
        const { data, error } = await query;
        
        if (error) {
          console.error(`Error fetching data from ${tableName}:`, error);
          throw new Error(`Error fetching data: ${error.message}`);
        }
        
        return data || [];
      }
      
      // For larger ranges, we need to fetch the data and aggregate it in the application
      const { data, error } = await query.order('created_at', { ascending: true });
      
      if (error) {
        console.error(`Error fetching data from ${tableName}:`, error);
        throw new Error(`Error fetching data: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        return [];
      }

      // Determine aggregation period based on date range
      let aggregationPeriod: 'hour' | 'day' | 'month';
      
      if (daysInRange > 1 && daysInRange < 7) {
        // Between 1 day and 1 week - aggregate by hour
        aggregationPeriod = 'hour';
      } else if (daysInRange >= 7 && monthsInRange < 1) {
        // Between 1 week and 1 month - aggregate by day
        aggregationPeriod = 'day';
      } else if (yearsInRange >= 1) {
        // >= 1 year - aggregate by month
        aggregationPeriod = 'month';
      } else {
        // Between 1 month and 1 year - aggregate by day
        aggregationPeriod = 'day';
      }

      return this.aggregateData(data, aggregationPeriod);
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

  /**
   * Aggregate device data based on the specified period
   * @param data The data to aggregate
   * @param period The aggregation period ('hour', 'day', or 'month')
   * @returns The aggregated data
   */
  private aggregateData(data: any[], period: 'hour' | 'day' | 'month'): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    const groupedData = new Map<string, any[]>();

    // Group data by the specified period
    data.forEach(item => {
      const date = moment(item.created_at);
      let key: string;

      switch (period) {
        case 'hour':
          // Group by hour: YYYY-MM-DD HH:00
          key = date.format('YYYY-MM-DD HH:00');
          break;
        case 'day':
          // Group by day: YYYY-MM-DD
          key = date.format('YYYY-MM-DD');
          break;
        case 'month':
          // Group by month: YYYY-MM
          key = date.format('YYYY-MM');
          break;
      }

      if (!groupedData.has(key)) {
        groupedData.set(key, []);
      }
      groupedData.get(key)?.push(item);
    });

    // Calculate averages for each group
    const aggregatedData = Array.from(groupedData.entries()).map(([key, items]) => {
      // Create a new object with device ID and created_at
      const result: any = {
        dev_eui: items[0].dev_eui,
        created_at: key,
      };

      // Calculate average for each numeric field
      const numericFields = Object.keys(items[0]).filter(field => 
        typeof items[0][field] === 'number' && 
        field !== 'id' && 
        field !== 'dev_eui'
      );

      numericFields.forEach(field => {
        const sum = items.reduce((total, item) => 
          total + (typeof item[field] === 'number' ? item[field] : 0), 0);
        result[field] = parseFloat((sum / items.length).toFixed(2));
      });

      // Copy non-numeric fields from the first item (except created_at which we've already set)
      const nonNumericFields = Object.keys(items[0]).filter(field => 
        typeof items[0][field] !== 'number' && 
        field !== 'created_at'
      );

      nonNumericFields.forEach(field => {
        result[field] = items[0][field];
      });

      return result;
    });

    // Sort by created_at in descending order
    return aggregatedData.sort((a, b) => 
      moment(b.created_at).valueOf() - moment(a.created_at).valueOf()
    );
  }

  /**
   * Get the latest data for a device based on its type, with optimized handling for large tables
   * @param devEui The device EUI
   * @param deviceType The device type information containing data_table_v2
   */
  private async getDeviceAndType(devEui: string): Promise<any> {
    if (!devEui) {
      throw new Error('Device EUI not specified');
    }

    const { data: cw_device, error: deviceError } = await this.supabase
      .from('cw_devices')
      .select('*, cw_device_type(*)')
      .eq('dev_eui', devEui)
      .single();

    if (deviceError) {
      console.error(`Error fetching device type for ${devEui}:`, deviceError);
      throw new Error(`Error fetching device type: ${deviceError.message}`);
    }

    if (!cw_device || !cw_device.cw_device_type.data_table_v2) {
      throw new Error('Device type or data table not specified');
    }

    return cw_device;
  }
}