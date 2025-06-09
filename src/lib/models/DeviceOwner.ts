import type { Database } from '../../../database.types';

/**
 * Represents a device owner entity from the database
 */
export type DeviceOwner = Database['public']['Tables']['cw_device_owners']['Row'];

/**
 * Type for creating a new device owner
 */
export type DeviceOwnerInsert = Database['public']['Tables']['cw_device_owners']['Insert'];

/**
 * Type for updating an existing device owner
 */
export type DeviceOwnerUpdate = Database['public']['Tables']['cw_device_owners']['Update'];

/**
 * Type for device owner with user profile information
 */
export interface DeviceOwnerWithProfile extends DeviceOwner {
  profile?: {
    id: string;
    full_name?: string;
    email?: string;
    username?: string;
  };
}
