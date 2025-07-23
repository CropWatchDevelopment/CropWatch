import { BaseRepository } from './BaseRepository';
import type { Gateway, GatewayInsert, GatewayUpdate } from '../models/Gateway';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../database.types';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

export interface PaginatedGateways {
	gateways: Gateway[];
	totalCount: number;
	currentPage: number;
	totalPages: number;
	hasNextPage: boolean;
	hasPreviousPage: boolean;
}

export class GatewayRepository extends BaseRepository<Gateway, string> {
	protected tableName = 'cw_gateways';
	protected primaryKey = 'gateway_id';
	protected entityName = 'Gateway';

	constructor(supabaseClient: SupabaseClient<Database>, errorHandler: ErrorHandlingService) {
		super(supabaseClient, errorHandler);
	}

	/**
	 * Get paginated gateways
	 */
	async getPaginatedGateways(
		page: number = 1,
		limit: number = 10,
		userId?: string
	): Promise<PaginatedGateways> {
		const start = (page - 1) * limit;
		const end = start + limit - 1;

		try {
			// Get total count first
			let countQuery = this.supabase
				.from('cw_gateways')
				.select('*', { count: 'exact', head: true });

			// If userId is provided, join with cw_gateways_owners to filter by user
			if (userId) {
				countQuery = this.supabase
					.from('cw_gateways')
					.select('*, cw_gateways_owners!inner(*)', { count: 'exact', head: true })
					.eq('cw_gateways_owners.user_id', userId);
			}

			const { count, error: countError } = await countQuery;

			if (countError) {
				console.error('Error getting gateway count:', countError);
				throw countError;
			}

			// Get paginated data
			let dataQuery = this.supabase
				.from('cw_gateways')
				.select('*')
				.order('gateway_name', { ascending: true })
				.range(start, end);

			// If userId is provided, join with cw_gateways_owners to filter by user
			if (userId) {
				dataQuery = this.supabase
					.from('cw_gateways')
					.select('*, cw_gateways_owners!inner(*)')
					.eq('cw_gateways_owners.user_id', userId)
					.order('gateway_name', { ascending: true })
					.range(start, end);
			}

			const { data, error } = await dataQuery;

			if (error) {
				console.error('Error getting paginated gateways:', error);
				throw error;
			}

			const totalCount = count || 0;
			const totalPages = Math.ceil(totalCount / limit);

			return {
				gateways: data || [],
				totalCount,
				currentPage: page,
				totalPages,
				hasNextPage: page < totalPages,
				hasPreviousPage: page > 1
			};
		} catch (error) {
			console.error('Error in getPaginatedGateways:', error);
			throw error;
		}
	}

	/**
	 * Get all gateways for a specific user
	 */
	async getGatewaysByUserId(userId: string): Promise<Gateway[]> {
		try {
			const { data, error } = await this.supabase
				.from('cw_gateways')
				.select('*, cw_gateways_owners!inner(*)')
				.eq('cw_gateways_owners.user_id', userId)
				.order('gateway_name', { ascending: true });

			if (error) {
				console.error('Error getting gateways by user ID:', error);
				throw error;
			}

			return data || [];
		} catch (error) {
			console.error('Error in getGatewaysByUserId:', error);
			throw error;
		}
	}

	/**
	 * Get gateway by ID
	 */
	async getGatewayById(gatewayId: string): Promise<Gateway | null> {
		try {
			const { data, error } = await this.supabase
				.from('cw_gateways')
				.select('*')
				.eq('gateway_id', gatewayId)
				.single();

			if (error) {
				if (error.code === 'PGRST116') {
					return null; // No rows found
				}
				console.error('Error getting gateway by ID:', error);
				throw error;
			}

			return data;
		} catch (error) {
			console.error('Error in getGatewayById:', error);
			throw error;
		}
	}

	/**
	 * Get count of online gateways
	 */
	async getOnlineGatewaysCount(userId?: string): Promise<number> {
		try {
			let query = this.supabase
				.from('cw_gateways')
				.select('*', { count: 'exact', head: true })
				.eq('is_online', true);

			// If userId is provided, join with cw_gateways_owners to filter by user
			if (userId) {
				query = this.supabase
					.from('cw_gateways')
					.select('*, cw_gateways_owners!inner(*)', { count: 'exact', head: true })
					.eq('is_online', true)
					.eq('cw_gateways_owners.user_id', userId);
			}

			const { count, error } = await query;

			if (error) {
				console.error('Error getting online gateways count:', error);
				throw error;
			}

			return count || 0;
		} catch (error) {
			console.error('Error in getOnlineGatewaysCount:', error);
			throw error;
		}
	}

	/**
	 * Create a new gateway
	 */
	async createGateway(gatewayData: GatewayInsert): Promise<Gateway> {
		try {
			const { data, error } = await this.supabase
				.from('cw_gateways')
				.insert(gatewayData)
				.select()
				.single();

			if (error) {
				console.error('Error creating gateway:', error);
				throw error;
			}

			return data;
		} catch (error) {
			console.error('Error in createGateway:', error);
			throw error;
		}
	}

	/**
	 * Update gateway
	 */
	async updateGateway(gatewayId: string, updates: GatewayUpdate): Promise<Gateway> {
		try {
			const { data, error } = await this.supabase
				.from('cw_gateways')
				.update(updates)
				.eq('gateway_id', gatewayId)
				.select()
				.single();

			if (error) {
				console.error('Error updating gateway:', error);
				throw error;
			}

			return data;
		} catch (error) {
			console.error('Error in updateGateway:', error);
			throw error;
		}
	}

	/**
	 * Delete gateway
	 */
	async deleteGateway(gatewayId: string): Promise<void> {
		try {
			const { error } = await this.supabase
				.from('cw_gateways')
				.delete()
				.eq('gateway_id', gatewayId);

			if (error) {
				console.error('Error deleting gateway:', error);
				throw error;
			}
		} catch (error) {
			console.error('Error in deleteGateway:', error);
			throw error;
		}
	}
}
