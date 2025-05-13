import type { ISoilDataService } from '../interfaces/ISoilDataService';
import { SoilDataRepository } from '../repositories/SoilDataRepository';
import type { SoilData, SoilDataInsert } from '../models/SoilData';

/**
 * Implementation of SoilDataService
 * This service handles all business logic related to soil data
 */
export class SoilDataService implements ISoilDataService {
  /**
   * Constructor with SoilDataRepository dependency
   */
  constructor(
    private soilDataRepository: SoilDataRepository
  ) {}

  /**
   * Get soil data by device EUI
   * @param devEui The device EUI
   */
  async getSoilDataByDevice(devEui: string): Promise<SoilData[]> {
    return this.soilDataRepository.findByDeviceEui(devEui);
  }

  /**
   * Get latest soil data for a device
   * @param devEui The device EUI
   */
  async getLatestSoilDataByDevice(devEui: string): Promise<SoilData | null> {
    return this.soilDataRepository.findLatestByDeviceEui(devEui);
  }

  /**
   * Get soil data within a date range
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  async getSoilDataByDateRange(devEui: string, startDate: Date, endDate: Date): Promise<SoilData[]> {
    return this.soilDataRepository.findByDateRange(devEui, startDate, endDate);
  }

  /**
   * Create a new soil data record
   * @param soilData The soil data record to create
   */
  async createSoilData(soilData: SoilDataInsert): Promise<SoilData> {
    return this.soilDataRepository.create(soilData);
  }
}