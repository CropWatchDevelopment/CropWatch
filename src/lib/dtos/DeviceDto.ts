import type { Device, DeviceType, DeviceLocation } from '../models/Device';

/**
 * DTO for device creation
 */
export interface CreateDeviceDto {
  /**
   * Device EUI (unique identifier)
   */
  dev_eui: string;
  
  /**
   * Device name
   */
  name: string;
  
  /**
   * Device type ID
   */
  type?: number;
  
  /**
   * Location ID where device is installed
   */
  location_id?: number;
  
  /**
   * Latitude coordinate
   */
  lat?: number;
  
  /**
   * Longitude coordinate
   */
  long?: number;
  
  /**
   * Serial number of the device
   */
  serial_number?: string;
  
  /**
   * Upload interval in seconds
   */
  upload_interval?: number;
}

/**
 * DTO for device updates
 */
export interface UpdateDeviceDto {
  /**
   * Device name
   */
  name?: string;
  
  /**
   * Device type ID
   */
  type?: number;
  
  /**
   * Location ID where device is installed
   */
  location_id?: number;
  
  /**
   * Latitude coordinate
   */
  lat?: number;
  
  /**
   * Longitude coordinate
   */
  long?: number;
  
  /**
   * Upload interval in seconds
   */
  upload_interval?: number;
  
  /**
   * Date when battery was changed
   */
  battery_changed_at?: string;
}

/**
 * DTO for device responses with minimal information
 */
export interface DeviceDto {
  /**
   * Device EUI (unique identifier)
   */
  dev_eui: string;
  
  /**
   * Device name
   */
  name: string;
  
  /**
   * Device type ID
   */
  type?: number;
  
  /**
   * Location ID where device is installed
   */
  location_id?: number;
  
  /**
   * Latitude coordinate
   */
  lat?: number;
  
  /**
   * Longitude coordinate
   */
  long?: number;
  
  /**
   * Upload interval in seconds
   */
  upload_interval?: number;
}

/**
 * DTO for detailed device information including type and location
 */
export interface DeviceDetailDto extends DeviceDto {
  /**
   * Device type information
   */
  deviceType?: DeviceTypeDto;
  
  /**
   * Device location information
   */
  location?: DeviceLocationDto;
  
  /**
   * Serial number of the device
   */
  serial_number?: string;
  
  /**
   * Date when device was installed
   */
  installed_at?: string;
  
  /**
   * Date when battery was changed
   */
  battery_changed_at?: string;
  
  /**
   * Date when warranty started
   */
  warranty_start_date?: string;
}

/**
 * DTO for device type information
 */
export interface DeviceTypeDto {
  /**
   * Device type ID
   */
  id: number;
  
  /**
   * Device type name
   */
  name: string;
  
  /**
   * Device manufacturer
   */
  manufacturer?: string;
  
  /**
   * Device model
   */
  model?: string;
}

/**
 * DTO for device location information
 */
export interface DeviceLocationDto {
  /**
   * Location ID
   */
  location_id: number;
  
  /**
   * Location name
   */
  name: string;
  
  /**
   * Location description
   */
  description?: string;
  
  /**
   * Latitude coordinate
   */
  lat?: number;
  
  /**
   * Longitude coordinate
   */
  long?: number;
}

/**
 * Maps a Device entity to a DeviceDto
 * @param device The device entity to map
 * @returns DeviceDto
 */
export function toDeviceDto(device: Device): DeviceDto {
  return {
    dev_eui: device.dev_eui,
    name: device.name,
    type: device.type,
    location_id: device.location_id,
    lat: device.lat,
    long: device.long,
    upload_interval: device.upload_interval
  };
}

/**
 * Maps a Device entity with type to a DeviceDetailDto
 * @param device The device entity to map
 * @param deviceType Optional device type information
 * @param location Optional location information
 * @returns DeviceDetailDto
 */
export function toDeviceDetailDto(
  device: Device,
  deviceType?: DeviceType,
  location?: DeviceLocation
): DeviceDetailDto {
  const detailDto: DeviceDetailDto = {
    ...toDeviceDto(device),
    serial_number: device.serial_number,
    installed_at: device.installed_at,
    battery_changed_at: device.battery_changed_at,
    warranty_start_date: device.warranty_start_date
  };
  
  if (deviceType) {
    detailDto.deviceType = {
      id: deviceType.id,
      name: deviceType.name,
      manufacturer: deviceType.manufacturer,
      model: deviceType.model
    };
  }
  
  if (location) {
    detailDto.location = {
      location_id: location.location_id,
      name: location.name,
      description: location.description,
      lat: location.lat,
      long: location.long
    };
  }
  
  return detailDto;
}