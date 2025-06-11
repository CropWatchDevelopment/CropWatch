/**
 * Interface for dynamic device data retrieval based on device type
 */
export interface IDeviceDataService {
  /**
   * Get the latest data for a device based on its type
   * @param devEui The device EUI
   */
  getLatestDeviceData(devEui: string): Promise<Record<string, unknown> | null>;
  
  /**
   * Get device data within a date range based on device type
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  getDeviceDataByDateRange(
    devEui: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, unknown>[]>;
}