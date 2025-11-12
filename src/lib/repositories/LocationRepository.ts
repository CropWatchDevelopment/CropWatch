import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { Location, LocationInsert, LocationUpdate } from '../models/Location';
import type { LocationUser } from '../models/LocationUser';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for location data access
 */
export class LocationRepository extends BaseRepository<Location, number> {
	protected tableName = 'cw_locations';
	protected primaryKey = 'location_id';
	protected entityName = 'Location';

	/**
	 * Constructor with Supabase client and error handler dependencies
	 */
	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find all locations
	 */
	async findAll(): Promise<Location[]> {
		const { data, error } = await this.supabase.from(this.tableName).select('*').order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error finding all locations');
		}

		return (data as Location[]) || [];
	}

	/**
	 * Find locations by owner ID
	 * @param ownerId The owner ID
	 */
	async findByOwnerId(ownerId: string): Promise<Location[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('owner_id', ownerId)
			.order('name');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding locations by owner ID: ${ownerId}`
			);
		}

		return (data as Location[]) || [];
	}

	/**
	 * Create a new location
	 * @param location The location to create
	 */
	override async create<I>(entity: I): Promise<Location> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.insert(entity)
			.select()
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error creating location');
		}

		return data as Location;
	}

	/**
	 * Update an existing location
	 * @param id The location ID
	 * @param location The location with updated values
	 */
	override async update<U>(id: number, entity: U): Promise<Location | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.update(entity)
			.eq(this.primaryKey, id)
			.select()
			.single();

		if (error) {
			// For "no rows found" error, return null
			if (error.code === 'PGRST116') {
				return null;
			}

			this.errorHandler.handleDatabaseError(error, `Error updating location with ID: ${id}`);
		}

		return data as Location;
	}

	/**
	 * Get all users with access to a location
	 * @param locationId The location ID
	 */
	async getLocationUsers(locationId: number): Promise<LocationUser[]> {
		const { data, error } = await this.supabase
			.from('cw_location_owners')
			.select(
				`
        id,
        user_id,
        location_id,
        permission_level,
        is_active,
        description,
        profile:user_id (
          full_name,
          email,
          username
        )
      `
			)
			.eq('location_id', locationId);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error fetching users for location: ${locationId}`
			);
		}

		const normalized = (data ?? []).map((row: any) => ({
			...row,
			profile: Array.isArray(row.profile) ? row.profile[0] : row.profile
		}));

		return normalized as LocationUser[];
	}

	/**
	 * Check if a user has sufficient permissions to access a location
	 * @param locationId The location ID
	 * @param userId The user ID
	 * @param requiredLevel The minimum required permission level (defaults to 3 - Viewer)
	 */
	async checkUserPermission(
		locationId: number,
		userId: string,
		requiredLevel: number = 3
	): Promise<boolean> {
		const { data: locationOwner, error: LocationOwnerError } = await this.supabase
			.from('cw_locations')
			.select('owner_id')
			.eq('location_id', locationId)
			.eq('owner_id', userId)
			.single();

		if (locationOwner?.owner_id) {
			return true; // User is the owner, automatically has full permissions
		}

		const { data, error } = await this.supabase
			.from('cw_location_owners')
			.select('permission_level')
			.eq('location_id', locationId)
			.eq('user_id', userId)
			.eq('is_active', true)
			.single();

		if (error) {
			return false;
		}

		return (data?.permission_level ?? 4) <= requiredLevel;
	}

	/**
	 * Find a user by email
	 * @param email The user's email
	 */
	async findUserByEmail(email: string): Promise<{ id: string } | null> {
		const { data, error } = await this.supabase
			.from('profiles')
			.select('id')
			.eq('email', email)
			.single();

		if (error) {
			return null;
		}

		return data;
	}

	/**
	 * Find a location owner entry
	 * @param locationId The location ID
	 * @param userId The user ID
	 */
	async findLocationOwner(locationId: number, userId: string): Promise<{ id: number } | null> {
		const { data, error } = await this.supabase
			.from('cw_location_owners')
			.select('id')
			.eq('location_id', locationId)
			.eq('user_id', userId)
			.single();

		if (error) {
			return null;
		}

		return data;
	}

	/**
	 * Get a location owner entry by ID
	 * @param id The location owner entry ID
	 */
	async getLocationOwnerById(id: number): Promise<LocationUser | null> {
		const { data, error } = await this.supabase
			.from('cw_location_owners')
			.select('*')
			.eq('id', id)
			.maybeSingle();

		if (error && error.code !== 'PGRST116') {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding location owner by record id ${id}`
			);
		}

		if (!data) {
			return null;
		}

		return data as LocationUser;
	}

	/**
	 * Get a location owner entry by ID
	 * @param id The location owner entry ID
	 */
	async getLocationUserById(userId: string): Promise<{ user_id: string } | null> {
		const { data, error } = await this.supabase
			.from('cw_location_owners')
			.select('user_id')
			.eq('user_id', userId)
			.single();

		if (error) {
			return null;
		}

		return data;
	}

	/**
	 * Add a user to a location with a specified permission level
	 * @param locationId The location ID
	 * @param userId The user ID
	 * @param permissionLevel The permission level to assign
	 */
	async addUserToLocation(
		locationId: number,
		userId: string,
		permissionLevel: number
	): Promise<void> {
		// fetch the owner_id for this location
		const { data: loc, error: locError } = await this.supabase
			.from('cw_locations')
			.select('owner_id')
			.eq('location_id', locationId)
			.single();

		if (locError) {
			this.errorHandler.handleDatabaseError(
				locError,
				`Error getting owner for location ${locationId}`
			);
			return;
		}

		const { error } = await this.supabase.from('cw_location_owners').insert({
			location_id: locationId,
			user_id: userId,
			permission_level: permissionLevel,
			admin_user_id: loc.owner_id, // ensure this matches the location owner
			is_active: true
		});

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error adding user ${userId} to location ${locationId}`
			);
		}
	}

	/**
	 * Update a user's permission for a location
	 * @param locationOwnerId The location owner entry ID
	 * @param permissionLevel The new permission level
	 */
	async updateUserPermission(locationOwnerId: number, permissionLevel: number): Promise<void> {
		const { error } = await this.supabase
			.from('cw_location_owners')
			.update({ permission_level: permissionLevel })
			.eq('id', locationOwnerId);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error updating permission for location owner ${locationOwnerId}`
			);
		}
	}

	/**
	 * Remove a user from a location
	 * @param locationOwnerId The location owner entry ID
	 */
	async removeUserFromLocationByRecordId(userRecordId: number): Promise<void> {
		const { error } = await this.supabase
			.from('cw_location_owners')
			.delete()
			.eq('id', userRecordId);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error removing user from location (record id: ${userRecordId})`
			);
		}
	}

	/**
	 * Remove a user from a location
	 * @param locationOwnerId The location owner entry ID
	 */
	async removeUserFromLocationByUserId(userId: string, locationId: number): Promise<void> {
		const { error } = await this.supabase
			.from('cw_location_owners')
			.delete()
			.eq('user_id', userId)
			.eq('location_id', locationId)
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error removing user ${userId} from location ${locationId}`
			);
		}
	}

	/**
	 * Count the number of other admin users for a location
	 * @param locationId The location ID
	 * @param excludeUserId The user ID to exclude from the count
	 */
	async countOtherAdmins(locationId: number, excludeUserId: string): Promise<number> {
		const { data, error } = await this.supabase
			.from('cw_location_owners')
			.select('id')
			.eq('location_id', locationId)
			.eq('permission_level', 1) // Admin
			.neq('user_id', excludeUserId);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error counting other admins for location ${locationId}`
			);
		}

		return data?.length ?? 0;
	}
}
