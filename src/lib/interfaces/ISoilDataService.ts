import type { SoilData, SoilDataInsert } from '../models/SoilData';

/**
 * Service interface for soil data operations
 */
export interface ISoilDataService {
  /**
   * Get soil data by device EUI
   * @param devEui The device EUI
   */
  getSoilDataByDevice(devEui: string): Promise<SoilData[]>;
  
  /**
   * Get latest soil data for a device
   * @param devEui The device EUI
   */
  getLatestSoilDataByDevice(devEui: string): Promise<SoilData | null>;
  
  /**
   * Get soil data within a date range
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  getSoilDataByDateRange(devEui: string, startDate: Date, endDate: Date): Promise<SoilData[]>;
  
  /**
   * Create a new soil data record
   * @param soilData The soil data record to create
   */
  createSoilData(soilData: SoilDataInsert): Promise<SoilData>;
}