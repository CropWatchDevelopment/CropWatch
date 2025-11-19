import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type {
	Gateway,
	GatewayInsert,
	GatewayOwner,
	GatewayOwnerInsert,
	GatewayUpdate
} from '../models/Gateway';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

/**
 * Repository for gateway data access
 */
export class GatewayRepository extends BaseRepository<Gateway, number> {
	protected tableName = 'cw_gateways';
	protected primaryKey = 'id';
	protected entityName = 'Gateway';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	/**
	 * Find a gateway by its gateway_id (external ID)
	 */
	async findByGatewayId(gatewayId: string): Promise<Gateway | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('gateway_id', gatewayId)
			.maybeSingle();

		if (error && error.code !== 'PGRST116') {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding ${this.entityName} with gateway_id: ${gatewayId}`
			);
		}

		return (data as Gateway) ?? null;
	}

	/**
	 * Upsert a gateway using the unique gateway_id column
	 */
	async upsertByGatewayId(payload: GatewayInsert | GatewayUpdate): Promise<Gateway> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.upsert(payload, {
				onConflict: 'gateway_id',
				ignoreDuplicates: false
			})
			.select()
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error upserting ${this.entityName}`);
		}

		return data as Gateway;
	}

	/**
	 * Update online status by gateway_id
	 */
	async setOnlineStatusByGatewayId(gatewayId: string, isOnline: boolean): Promise<Gateway | null> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.update({
				is_online: isOnline,
				updated_at: new Date().toISOString()
			})
			.eq('gateway_id', gatewayId)
			.select()
			.maybeSingle();

		if (error) {
			if (error.code === 'PGRST116') {
				return null;
			}

			this.errorHandler.handleDatabaseError(
				error,
				`Error updating status for ${this.entityName} ${gatewayId}`
			);
		}

		return (data as Gateway) ?? null;
	}

	/**
	 * Get all public gateways
	 */
	async findPublicGateways(): Promise<Gateway[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.eq('is_public', true)
			.order('gateway_name');

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error finding public ${this.entityName}s`);
		}

		return (data as Gateway[]) ?? [];
	}

	/**
	 * Fetch gateways owned/shared with the given user
	 */
	async findByUser(userId: string): Promise<Gateway[]> {
		const { data: ownerRows, error: ownerError } = await this.supabase
			.from('cw_gateways_owners')
			.select('gateway_id')
			.eq('user_id', userId);

		if (ownerError) {
			this.errorHandler.handleDatabaseError(
				ownerError,
				`Error finding ${this.entityName} owners for user ${userId}`
			);
		}

		const gatewayIds = (ownerRows ?? []).map((row) => row.gateway_id);
		if (!gatewayIds.length) {
			return [];
		}

		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*')
			.in('id', gatewayIds);

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error loading ${this.entityName}s for user ${userId}`
			);
		}

		return (data as Gateway[]) ?? [];
	}

	/**
	 * Add a user owner entry for a gateway
	 */
	async addOwner(entry: GatewayOwnerInsert): Promise<GatewayOwner> {
		const { data, error } = await this.supabase
			.from('cw_gateways_owners')
			.insert(entry)
			.select()
			.single();

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error adding gateway owner');
		}

		return data as GatewayOwner;
	}

	/**
	 * Remove an owner entry for a gateway
	 */
	async removeOwner(gatewayId: number, userId: string): Promise<void> {
		const { error } = await this.supabase
			.from('cw_gateways_owners')
			.delete()
			.eq('gateway_id', gatewayId)
			.eq('user_id', userId);

		if (error) {
			this.errorHandler.handleDatabaseError(error, `Error removing gateway owner (${userId})`);
		}
	}
}
