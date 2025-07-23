import type { Gateway, GatewayInsert, GatewayUpdate } from '../models/Gateway';
import { GatewayRepository, type PaginatedGateways } from '../repositories/GatewayRepository';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../database.types';

export class GatewayService {
	private gatewayRepository: GatewayRepository;
	private errorHandler: ErrorHandlingService;

	constructor(supabaseClient: SupabaseClient<Database>) {
		this.errorHandler = new ErrorHandlingService();
		this.gatewayRepository = new GatewayRepository(supabaseClient, this.errorHandler);
	}

	/**
	 * Get paginated gateways
	 */
	async getPaginatedGateways(
		page: number = 1,
		limit: number = 10,
		userId?: string
	): Promise<PaginatedGateways> {
		try {
			return await this.gatewayRepository.getPaginatedGateways(page, limit, userId);
		} catch (error) {
			console.error('Error in GatewayService.getPaginatedGateways:', error);
			throw error;
		}
	}

	/**
	 * Get all gateways for a specific user
	 */
	async getGatewaysByUserId(userId: string): Promise<Gateway[]> {
		try {
			return await this.gatewayRepository.getGatewaysByUserId(userId);
		} catch (error) {
			console.error('Error in GatewayService.getGatewaysByUserId:', error);
			throw error;
		}
	}

	/**
	 * Get gateway by ID
	 */
	async getGatewayById(gatewayId: string): Promise<Gateway | null> {
		try {
			return await this.gatewayRepository.getGatewayById(gatewayId);
		} catch (error) {
			console.error('Error in GatewayService.getGatewayById:', error);
			throw error;
		}
	}

	/**
	 * Get count of online gateways
	 */
	async getOnlineGatewaysCount(userId?: string): Promise<number> {
		try {
			return await this.gatewayRepository.getOnlineGatewaysCount(userId);
		} catch (error) {
			console.error('Error in GatewayService.getOnlineGatewaysCount:', error);
			// Return 0 if there's an error to prevent the dashboard from breaking
			return 0;
		}
	}

	/**
	 * Create a new gateway
	 */
	async createGateway(gatewayData: GatewayInsert): Promise<Gateway> {
		try {
			return await this.gatewayRepository.createGateway(gatewayData);
		} catch (error) {
			console.error('Error in GatewayService.createGateway:', error);
			throw error;
		}
	}

	/**
	 * Update gateway
	 */
	async updateGateway(gatewayId: string, updates: GatewayUpdate): Promise<Gateway> {
		try {
			return await this.gatewayRepository.updateGateway(gatewayId, updates);
		} catch (error) {
			console.error('Error in GatewayService.updateGateway:', error);
			throw error;
		}
	}

	/**
	 * Delete gateway
	 */
	async deleteGateway(gatewayId: string): Promise<void> {
		try {
			await this.gatewayRepository.deleteGateway(gatewayId);
		} catch (error) {
			console.error('Error in GatewayService.deleteGateway:', error);
			throw error;
		}
	}

	/**
	 * Get gateway statistics for dashboard
	 */
	async getGatewayStats(userId?: string): Promise<{
		totalGateways: number;
		onlineGateways: number;
		offlineGateways: number;
		onlinePercentage: number;
	}> {
		try {
			const [totalResult, onlineCount] = await Promise.all([
				this.gatewayRepository.getPaginatedGateways(1, 1, userId),
				this.gatewayRepository.getOnlineGatewaysCount(userId)
			]);

			const totalGateways = totalResult.totalCount;
			const offlineGateways = totalGateways - onlineCount;
			const onlinePercentage = totalGateways > 0 ? (onlineCount / totalGateways) * 100 : 0;

			return {
				totalGateways,
				onlineGateways: onlineCount,
				offlineGateways,
				onlinePercentage
			};
		} catch (error) {
			console.error('Error in GatewayService.getGatewayStats:', error);
			// Return default values if there's an error
			return {
				totalGateways: 0,
				onlineGateways: 0,
				offlineGateways: 0,
				onlinePercentage: 0
			};
		}
	}
}
