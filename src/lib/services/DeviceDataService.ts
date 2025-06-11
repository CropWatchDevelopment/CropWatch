import moment from 'moment';
import type { IDeviceDataService } from '../interfaces/IDeviceDataService';
import { injectable, inject } from 'inversify';
import { TYPES } from '$lib/server/ioc.types';
import { DeviceRepository } from '../repositories/DeviceRepository';
import { DeviceDataRepository } from '../repositories/DeviceDataRepository';

@injectable()
export class DeviceDataService implements IDeviceDataService {
  constructor(
    @inject(TYPES.DeviceRepository) private readonly deviceRepository: DeviceRepository,
    @inject(TYPES.DeviceDataRepository) private readonly deviceDataRepository: DeviceDataRepository
  ) {}

  async getLatestDeviceData(devEui: string): Promise<Record<string, unknown> | null> {
    if (!devEui) {
      throw new Error('Device EUI not specified');
    }

    const device = await this.getDeviceAndType(devEui);
    const tableName = device.cw_device_type.data_table_v2;

    try {
      return await this.deviceDataRepository.findLatestByDeviceEui<Record<string, unknown>>(tableName, devEui);
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

  async getDeviceDataByDateRange(
    devEui: string,
    startDate: Date,
    endDate: Date
  ): Promise<Record<string, unknown>[]> {
    if (!devEui) {
      throw new Error('Device EUI not specified');
    }
    if (!startDate || !endDate) {
      throw new Error('Start date and end date must be specified');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }

    const device = await this.getDeviceAndType(devEui);
    const tableName = device.cw_device_type.data_table_v2;

    try {
      const monthsInRange = moment(endDate).diff(startDate, 'months');
      if (monthsInRange > 3) {
        throw new Error('Date range too large');
      }

      return await this.deviceDataRepository.findByDateRange<Record<string, unknown>>(
        tableName,
        devEui,
        startDate,
        endDate
      );
    } catch (error) {
      console.error(`Error in getDeviceDataByDateRange for ${devEui} in table ${tableName}:`, error);
      if (error instanceof Error && error.message.includes('AbortError')) {
        return [
          {
            error: 'Data retrieval timed out',
            partial: true,
            dev_eui: devEui,
            created_at: new Date().toISOString(),
            note: 'This is a placeholder due to query timeout'
          }
        ];
      }
      throw error;
    }
  }

  private async getDeviceAndType(devEui: string) {
    const device = await this.deviceRepository.getDeviceWithType(devEui);
    if (!device || !device.cw_device_type?.data_table_v2) {
      throw new Error('Device type or data table not specified');
    }
    return device;
  }
}
