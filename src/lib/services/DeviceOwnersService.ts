import type { SupabaseClient } from '@supabase/supabase-js';
import { injectable, inject } from 'inversify';
import { TYPES } from '$lib/server/ioc.types';
import { DeviceOwnersRepository } from '../repositories/DeviceOwnersRepository';
import type { DeviceOwner, DeviceOwnerInsert, DeviceOwnerUpdate, DeviceOwnerWithProfile } from '../models/DeviceOwner';

/**
 * Service for device owner business logic
 */
@injectable()
export class DeviceOwnersService {
  
  /**
   * Constructor with DeviceOwnersRepository dependency
   */
  constructor(
    @inject(TYPES.DeviceOwnersRepository) private repository: DeviceOwnersRepository
  ) {}

  /**
   * Get a device owner by ID
   * @param id The device owner ID
   */
  async getById(id: number): Promise<DeviceOwner | null> {
    return await this.repository.findById(id);
  }

  /**
   * Get all device owners
   */
  async getAll(): Promise<DeviceOwner[]> {
    return await this.repository.findAll();
  }

  /**
   * Get device owners by device EUI
   * @param devEui The device EUI
   */
  async getByDeviceEui(devEui: string): Promise<DeviceOwner[]> {
    return await this.repository.findByDeviceEui(devEui);
  }

  /**
   * Get device owners by user ID
   * @param userId The user ID
   */
  async getByUserId(userId: string): Promise<DeviceOwner[]> {
    return await this.repository.findByUserId(userId);
  }

  /**
   * Get device owners with profile information by device EUI
   * @param devEui The device EUI
   */
  async getWithProfilesByDeviceEui(devEui: string): Promise<DeviceOwnerWithProfile[]> {
    return await this.repository.findWithProfilesByDeviceEui(devEui);
  }

  /**
   * Get a specific device owner entry
   * @param devEui The device EUI
   * @param userId The user ID
   */
  async getByDeviceAndUser(devEui: string, userId: string): Promise<DeviceOwner | null> {
    return await this.repository.findByDeviceAndUser(devEui, userId);
  }

  /**
   * Check if a user has permission for a device
   * @param devEui The device EUI
   * @param userId The user ID
   * @param minimumPermission The minimum permission level required (optional)
   */
  async hasPermission(devEui: string, userId: string, minimumPermission?: number): Promise<boolean> {
    return await this.repository.hasPermission(devEui, userId, minimumPermission);
  }

  /**
   * Get devices owned by a user
   * @param userId The user ID
   */
  async getDevicesByUserId(userId: string): Promise<DeviceOwner[]> {
    return await this.repository.getDevicesByUserId(userId);
  }

  /**
   * Add a user to a device with a specified permission level
   * @param devEui The device EUI
   * @param userId The user ID
   * @param permissionLevel The permission level to assign
   */
  async addUserToDevice(devEui: string, userId: string, permissionLevel: number): Promise<DeviceOwner | null> {
    // Check if the user is already an owner of this device
    const existingOwner = await this.repository.findByDeviceAndUser(devEui, userId);
    if (existingOwner) {
      throw new Error(`User ${userId} is already an owner of device ${devEui}`);
    }

    const deviceOwner: DeviceOwnerInsert = {
      dev_eui: devEui,
      user_id: userId,
      permission_level: permissionLevel
    };

    return await this.repository.create(deviceOwner);
  }

  /**
   * Update a device owner's permission level
   * @param id The device owner ID
   * @param permissionLevel The new permission level
   */
  async updatePermission(id: number, permissionLevel: number): Promise<DeviceOwner | null> {
    return await this.repository.updatePermission(id, permissionLevel);
  }

  /**
   * Update a device owner entry
   * @param id The device owner ID
   * @param updates The updates to apply
   */
  async update(id: number, updates: DeviceOwnerUpdate): Promise<DeviceOwner | null> {
    return await this.repository.update(id, updates);
  }

  /**
   * Remove a user from a device
   * @param devEui The device EUI
   * @param userId The user ID to remove
   */
  async removeUserFromDevice(devEui: string, userId: string): Promise<void> {
    await this.repository.deleteByDeviceAndUser(devEui, userId);
  }

  /**
   * Remove a device owner by ID
   * @param id The device owner ID
   */
  async remove(id: number): Promise<void> {
    await this.repository.delete(id);
  }

  /**
   * Transfer device ownership
   * @param devEui The device EUI
   * @param fromUserId The current owner's user ID
   * @param toUserId The new owner's user ID
   * @param permissionLevel The permission level for the new owner
   */
  async transferOwnership(devEui: string, fromUserId: string, toUserId: string, permissionLevel: number = 100): Promise<void> {
    // Check if the target user is already an owner
    const existingOwner = await this.repository.findByDeviceAndUser(devEui, toUserId);
    if (existingOwner) {
      throw new Error(`User ${toUserId} is already an owner of device ${devEui}`);
    }

    // Add the new owner
    await this.addUserToDevice(devEui, toUserId, permissionLevel);

    // Remove the old owner
    await this.removeUserFromDevice(devEui, fromUserId);
  }

  /**
   * Get the highest permission level for a user on a device
   * @param devEui The device EUI
   * @param userId The user ID
   */
  async getUserPermissionLevel(devEui: string, userId: string): Promise<number | null> {
    const deviceOwner = await this.repository.findByDeviceAndUser(devEui, userId);
    return deviceOwner?.permission_level || null;
  }

  /**
   * Check if a user is the primary owner (highest permission) of a device
   * @param devEui The device EUI
   * @param userId The user ID
   */
  async isPrimaryOwner(devEui: string, userId: string): Promise<boolean> {
    const owners = await this.repository.findByDeviceEui(devEui);
    if (owners.length === 0) return false;

    const userOwner = owners.find(owner => owner.user_id === userId);
    if (!userOwner) return false;

    const maxPermission = Math.max(...owners.map(owner => owner.permission_level));
    return userOwner.permission_level === maxPermission;
  }
}
