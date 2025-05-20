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
   * @param deviceType The device type information containing data_table_v2
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
      const start = moment(startDate).utcOffset(+9).startOf('day').utc(true);
      const end = moment(endDate).utcOffset(+9).endOf('day').utc(true);

      // get the number of uploads between the selected start and end dates
      const monthsInRange = end.diff(start, 'months');
      if (monthsInRange > 3) {
        // If the range is too large, limit the query to the last 3 months
        throw new Error('Date range too large');
      }

      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('dev_eui', devEui)
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false })
      // .limit(maxDataToReturn);

      return data || [];
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