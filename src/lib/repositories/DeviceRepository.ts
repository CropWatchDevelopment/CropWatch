import type { SupabaseClient, QueryData } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Device, DeviceWithType, DeviceLocation } from '../models/Device';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { Database } from '../../../database.types';

/**
 * Type for device with joined location and device type data
 */
export type DeviceWithJoins = Device & {
	cw_device_type: Database['public']['Tables']['cw_device_type']['Row'];
	cw_locations: (DeviceLocation & {
		cw_location_owners: Database['public']['Tables']['cw_location_owners']['Row'][];
	})[];
};

/**
 * Repository for device data access
 */
export class DeviceRepository extends BaseRepository<Device, string> {
	protected tableName = 'cw_devices';
	protected primaryKey = 'dev_eui';
	protected entityName = 'Device';

	/**
	 * Constructor with Supabase client and error handler dependencies
	 */
	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Get a device with its type information
	 * @param devEui The device EUI
	 */
	async getDeviceWithType(devEui: string): Promise<DeviceWithType | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select(
				`
        *,
        cw_device_type(*),
		cw_device_owners(*, user_id),
        ip_log(*)
      `
			)
			.eq(this.primaryKey, devEui)
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding device with type by EUI: ${devEui}`
			);
		}

		return data as DeviceWithType;
	}

	/**
	 * Get devices by location ID
	 * @param locationId The location ID
	 */
	async findByLocation(locationId: number): Promise<DeviceWithJoins[]> {
		const session = await this.supabase.auth.getSession();

		// Define the query with proper typing
		const query = this.supabase
			.from(this.tableName)
			.select(
				`
        *,
        cw_device_type(*),
        cw_locations(*, cw_location_owners(*)),
        ip_log(*)
      `
			)
			.eq('location_id', locationId)
			.eq('cw_locations.cw_location_owners.user_id', session.data.session?.user.id);

		const { data, error } = await query;

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding devices by location: ${locationId}`
			);
		}

		return (data as DeviceWithJoins[]) || [];
	}

	/**
	 * Get all devices for a location without auth filtering
	 * @param locationId The location ID
	 */
	async getAllDevicesForLocation(locationId: number): Promise<Device[]> {
		// Define the query with proper typing
		const query = this.supabase.from(this.tableName).select('*').eq('location_id', locationId);

		const { data, error } = await query;

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding all devices by location: ${locationId}`
			);
		}

		return (data as Device[]) || [];
	}

	/**
	 * Get devices by type ID
	 * @param typeId The device type ID
	 */
	async findByType(typeId: number): Promise<Device[]> {
		const { data, error } = await this.supabase.from(this.tableName).select('*').eq('type', typeId);

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error finding devices by type: ${typeId}`);
		}

		return (data as Device[]) || [];
	}

	/**
	 * Find a device owner entry
	 * @param devEui The device EUI
	 * @param userId The user ID
	 */
	async findDeviceOwner(devEui: string, userId: string): Promise<{ id: number | string } | null> {
		const { data: ownerData, error: ownerError } = await this.supabase
			.from('cw_devices')
			.select('user_id')
			.eq('dev_eui', devEui)
			.eq('user_id', userId)
			.single();

		if (ownerData) {
			return ownerData.user_id;
		}

		const { data, error } = await this.supabase
			.from('cw_device_owners')
			.select('id')
			.eq('dev_eui', devEui)
			.eq('user_id', userId)
			.single();

		if (error) {
			return null;
		}

		return data;
	}

	/**
	 * Add a user to a device with a specified permission level
	 * @param devEui The device EUI
	 * @param userId The user ID
	 * @param permissionLevel The permission level to assign
	 */
	async addUserToDevice(devEui: string, userId: string, permissionLevel: number): Promise<void> {
		const { error } = await this.supabase.from('cw_device_owners').insert({
			dev_eui: devEui,
			user_id: userId,
			permission_level: permissionLevel
		});

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error adding user ${userId} to device ${devEui}`
			);
		}
	}

	/**
	 * Update a user's permission for a device
	 * @param deviceOwnerId The device owner entry ID
	 * @param permissionLevel The new permission level
	 */
	async updateDevicePermission(deviceOwnerId: number, permissionLevel: number): Promise<void> {
		const { error } = await this.supabase
			.from('cw_device_owners')
			.update({ permission_level: permissionLevel })
			.eq('id', deviceOwnerId);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error updating permission for device owner ${deviceOwnerId}`
			);
		}
	}

	/**
	 * Remove a user from a device
	 * @param devEui The device EUI
	 * @param userId The user ID to remove
	 */
	async removeUserFromDevice(devEui: string, userId: string): Promise<void> {
		const { error } = await this.supabase
			.from('cw_device_owners')
			.delete()
			.eq('dev_eui', devEui)
			.eq('user_id', userId);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error removing user ${userId} from device ${devEui}`
			);
		}
	}
}
