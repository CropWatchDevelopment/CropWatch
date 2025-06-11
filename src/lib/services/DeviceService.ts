import type { IDeviceService } from '../interfaces/IDeviceService';
import { DeviceRepository } from '../repositories/DeviceRepository';
import type { Device, DeviceInsert, DeviceUpdate, DeviceWithType } from '../models/Device';
import type { DeviceWithJoins } from '../repositories/DeviceRepository';
import { injectable, inject } from 'inversify';
import { TYPES } from '$lib/server/ioc.types';

/**
 * Implementation of DeviceService
 * This service handles all business logic related to devices
 */
@injectable()
export class DeviceService implements IDeviceService {
  /**
   * Constructor with DeviceRepository dependency
   */
  constructor(
    @inject(TYPES.DeviceRepository) private deviceRepository: DeviceRepository
  ) {}

  /**
   * Get a device by its EUI
   * @param devEui The device EUI
   */
  async getDeviceByEui(devEui: string): Promise<Device | null> {
    return this.deviceRepository.findById(devEui);
  }

  /**
   * Get a device with its type information
   * @param devEui The device EUI
   */
  async getDeviceWithTypeByEui(devEui: string): Promise<DeviceWithType | null> {
    return this.deviceRepository.getDeviceWithType(devEui);
  }

  /**
   * Get all devices
   */
  async getAllDevices(): Promise<Device[]> {
    return this.deviceRepository.findAll();
  }

  /**
   * Get devices by location ID
   * @param locationId The location ID
   */
  async getDevicesByLocation(locationId: number): Promise<DeviceWithJoins[]> {
    return this.deviceRepository.findByLocation(locationId);
  }

  /**
   * Get devices by type ID
   * @param typeId The device type ID
   */
  async getDevicesByType(typeId: number): Promise<Device[]> {
    return this.deviceRepository.findByType(typeId);
  }

  /**
   * Create a new device
   * @param device The device to create
   */
  async createDevice(device: DeviceInsert): Promise<Device> {
    return this.deviceRepository.create(device);
  }

  /**
   * Update an existing device
   * @param devEui The device EUI
   * @param device The device with updated values
   */
  async updateDevice(devEui: string, device: DeviceUpdate): Promise<Device | null> {
    return this.deviceRepository.update(devEui, device);
  }

  /**
   * Delete a device
   * @param devEui The device EUI
   */
  async deleteDevice(devEui: string): Promise<boolean> {
    return this.deviceRepository.delete(devEui);
  }
}