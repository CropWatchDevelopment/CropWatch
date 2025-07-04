import type { DeviceType } from '../models/Device';
import type { DeviceDataRecord } from '../models/DeviceDataRecord';

/**
 * Interface for dynamic device data retrieval based on device type
 */
export interface IDeviceDataService {
  /**
   * Get the latest data for a device based on its type
   * @param devEui The device EUI
   * @param deviceType The device type information containing data_table_v2
   */
  getLatestDeviceData(
    devEui: string,
    deviceType: DeviceType
  ): Promise<DeviceDataRecord | null>;
  
  /**
   * Get device data within a date range based on device type
   * @param devEui The device EUI
   * @param deviceType The device type information containing data_table_v2
   * @param startDate The start date
   * @param endDate The end date
   */
  getDeviceDataByDateRange(
    devEui: string,
    startDate: Date,
    endDate: Date
  ): Promise<DeviceDataRecord[]>;
}