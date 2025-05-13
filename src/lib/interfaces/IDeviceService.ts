import type { Device, DeviceInsert, DeviceUpdate, DeviceWithType } from '../models/Device';
import type { DeviceWithJoins } from '../repositories/DeviceRepository';

/**
 * Service interface for device operations
 */
export interface IDeviceService {
  /**
   * Get a device by its EUI
   * @param devEui The device EUI
   */
  getDeviceByEui(devEui: string): Promise<Device | null>;
  
  /**
   * Get a device with its type information
   * @param devEui The device EUI
   */
  getDeviceWithTypeByEui(devEui: string): Promise<DeviceWithType | null>;
  
  /**
   * Get all devices
   */
  getAllDevices(): Promise<Device[]>;
  
  /**
   * Get devices by location ID
   * @param locationId The location ID
   */
  getDevicesByLocation(locationId: number): Promise<DeviceWithJoins[]>;
  
  /**
   * Get devices by type ID
   * @param typeId The device type ID
   */
  getDevicesByType(typeId: number): Promise<Device[]>;
  
  /**
   * Create a new device
   * @param device The device to create
   */
  createDevice(device: DeviceInsert): Promise<Device>;
  
  /**
   * Update an existing device
   * @param devEui The device EUI
   * @param device The device with updated values
   */
  updateDevice(devEui: string, device: DeviceUpdate): Promise<Device | null>;
  
  /**
   * Delete a device
   * @param devEui The device EUI
   */
  deleteDevice(devEui: string): Promise<boolean>;
}