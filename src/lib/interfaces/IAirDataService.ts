import type { AirData, AirDataInsert, AirDataUpdate } from '../models/AirData';

/**
 * Service interface for air data operations
 */
export interface IAirDataService {
  /**
   * Get air data by device EUI
   * @param devEui The device EUI
   */
  getAirDataByDevice(devEui: string): Promise<AirData[]>;
  
  /**
   * Get latest air data for a device
   * @param devEui The device EUI
   */
  getLatestAirDataByDevice(devEui: string): Promise<AirData | null>;
  
  /**
   * Get air data within a date range
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  getAirDataByDateRange(devEui: string, startDate: Date, endDate: Date): Promise<AirData[]>;
  
  /**
   * Create a new air data record
   * @param airData The air data record to create
   */
  createAirData(airData: AirDataInsert): Promise<AirData>;
}