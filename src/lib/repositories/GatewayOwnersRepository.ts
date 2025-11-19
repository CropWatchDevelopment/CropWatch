import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type { GatewayOwner, GatewayOwnerInsert, GatewayOwnerUpdate } from '../models/Gateway';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for cw_gateways_owners table
 */
export class GatewayOwnersRepository extends BaseRepository<GatewayOwner, number> {
	protected tableName = 'cw_gateways_owners';
	protected primaryKey = 'id';
	protected entityName = 'GatewayOwner';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Fetch owner entries for a gateway
	 */
	async findByGatewayId(gatewayId: number): Promise<GatewayOwner[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('gateway_id', gatewayId)
			.order('id');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding gateway owners by gateway ID: ${gatewayId}`
			);
		}

		return (data as GatewayOwner[]) ?? [];
	}

	/**
	 * Fetch owner entries for a user
	 */
	async findByUserId(userId: string): Promise<GatewayOwner[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('user_id', userId)
			.order('id');

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding gateway owners by user ID: ${userId}`
			);
		}

		return (data as GatewayOwner[]) ?? [];
	}

	/**
	 * Fetch a single owner entry for gateway/user pair
	 */
	async findByGatewayAndUser(gatewayId: number, userId: string): Promise<GatewayOwner | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('gateway_id', gatewayId)
			.eq('user_id', userId)
			.maybeSingle();

		if (error && error.code !== 'PGRST116') {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding gateway owner by gateway ID ${gatewayId} and user ID ${userId}`
			);
		}

		return (data as GatewayOwner) ?? null;
	}

	/**
	 * Create a gateway owner entry
	 */
	override async create(entity: GatewayOwnerInsert): Promise<GatewayOwner> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.insert(entity)
			.select()
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error creating gateway owner');
		}

		return data as GatewayOwner;
	}

	/**
	 * Update a gateway owner entry
	 */
	override async update(id: number, entity: GatewayOwnerUpdate): Promise<GatewayOwner | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.update(entity)
			.eq(this.primaryKey, id)
			.select()
			.maybeSingle();

		if (error) {
			if (error.code === 'PGRST116') {
				return null;
			}

			this.errorHandler.handleDatabaseError(error, `Error updating gateway owner with ID: ${id}`);
		}

		return (data as GatewayOwner) ?? null;
	}

	/**
	 * Delete an entry by gateway/user pair
	 */
	async deleteByGatewayAndUser(gatewayId: number, userId: string): Promise<void> {
		const { error } = await this.supabase
			.from(this.tableName)
			.delete()
			.eq('gateway_id', gatewayId)
			.eq('user_id', userId);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error deleting gateway owner by gateway ID ${gatewayId} and user ID ${userId}`
			);
		}
	}
}
