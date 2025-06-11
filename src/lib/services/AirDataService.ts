import type { IAirDataService } from '../interfaces/IAirDataService';
import { AirDataRepository } from '../repositories/AirDataRepository';
import type { AirData, AirDataInsert } from '../models/AirData';
import { injectable, inject } from 'inversify';
import { TYPES } from '$lib/server/ioc.types';

/**
 * Implementation of AirDataService
 * This service handles all business logic related to air data
 */
@injectable()
export class AirDataService implements IAirDataService {
  /**
   * Constructor with AirDataRepository dependency
   */
  constructor(
    @inject(TYPES.AirDataRepository) private airDataRepository: AirDataRepository
  ) {}

  /**
   * Get air data by device EUI
   * @param devEui The device EUI
   */
  async getAirDataByDevice(devEui: string): Promise<AirData[]> {
    return this.airDataRepository.findByDeviceEui(devEui);
  }

  /**
   * Get latest air data for a device
   * @param devEui The device EUI
   */
  async getLatestAirDataByDevice(devEui: string): Promise<AirData | null> {
    return this.airDataRepository.findLatestByDeviceEui(devEui);
  }

  /**
   * Get air data within a date range
   * @param devEui The device EUI
   * @param startDate The start date
   * @param endDate The end date
   */
  async getAirDataByDateRange(devEui: string, startDate: Date, endDate: Date): Promise<AirData[]> {
    return this.airDataRepository.findByDateRange(devEui, startDate, endDate);
  }

  /**
   * Create a new air data record
   * @param airData The air data record to create
   */
  async createAirData(airData: AirDataInsert): Promise<AirData> {
    return this.airDataRepository.create(airData);
  }
}