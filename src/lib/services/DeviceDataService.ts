import moment from 'moment';
import type { IDeviceDataService } from '../interfaces/IDeviceDataService';
import type { DeviceType } from '../models/Device';
import type { DeviceDataRecord } from '../models/DeviceDataRecord';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { SupabaseClient } from '@supabase/supabase-js';

export class DeviceDataService implements IDeviceDataService {
  private readonly errorHandler: ErrorHandlingService;

  constructor(
    private readonly supabase: SupabaseClient,
    errorHandler: ErrorHandlingService = new ErrorHandlingService()
  ) {
    this.errorHandler = errorHandler;
  }

  /**
   * Get the latest data for a device based on its type, with optimized handling for large tables
   * @param devEui The device EUI
   * @param deviceType The device type information containing data_table_v2
   */
  public async getLatestDeviceData(
    devEui: string,
    _deviceType: DeviceType
  ): Promise<DeviceDataRecord | null> {
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
        this.errorHandler.logError(error);
        throw new Error(`Error fetching columns: ${error.message}`);
      }

      return data as DeviceDataRecord;
    } catch (error) {
      this.errorHandler.logError(error as Error);
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
  public async getDeviceDataByDateRange(
    devEui: string,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceDataRecord[]> {
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

      // get the number of uploads between the selected start and end dates
      const monthsInRange = moment(endDate).diff(startDate, 'months');
      if (monthsInRange > 3) {
        // If the range is too large, limit the query to the last 3 months
        throw new Error('Date range too large');
      }

      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .eq('dev_eui', devEui)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
      // .limit(maxDataToReturn);

      return (data || []) as DeviceDataRecord[];
    } catch (error) {
      // Handle errors with a generic response
      this.errorHandler.logError(error as Error);

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
  private async getDeviceAndType(
    devEui: string
  ): Promise<{ cw_device_type: DeviceType } & Record<string, unknown>> {
    if (!devEui) {
      throw new Error('Device EUI not specified');
    }

    const { data: cw_device, error: deviceError } = await this.supabase
      .from('cw_devices')
      .select('*, cw_device_type(*)')
      .eq('dev_eui', devEui)
      .single();

    if (deviceError) {
      this.errorHandler.logError(deviceError);
      throw new Error(`Error fetching device type: ${deviceError.message}`);
    }

    if (!cw_device || !cw_device.cw_device_type.data_table_v2) {
      throw new Error('Device type or data table not specified');
    }

    return cw_device;
  }
}