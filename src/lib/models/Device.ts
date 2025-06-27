import type { Database } from '../../../database.types';

/**
 * Represents a device entity from the database
 */
export type Device = Database['public']['Tables']['cw_devices']['Row'];

/**
 * Type for creating a new device
 */
export type DeviceInsert = Database['public']['Tables']['cw_devices']['Insert'];

/**
 * Type for updating an existing device
 */
export type DeviceUpdate = Database['public']['Tables']['cw_devices']['Update'];

/**
 * Type for device with detailed device type information
 */
export interface DeviceWithType extends Device {
	cw_device_type?: DeviceType;
}

/**
 * Type for device location
 */
export type DeviceLocation = Database['public']['Tables']['cw_locations']['Row'];

/**
 * Type for device type
 */
export type DeviceType = Database['public']['Tables']['cw_device_type']['Row'];
