import { GatewayOwnersRepository } from '../repositories/GatewayOwnersRepository';
import type { GatewayOwner, GatewayOwnerInsert, GatewayOwnerUpdate } from '../models/Gateway';

/**
 * Business logic for gateway ownership management
 */
export class GatewayOwnersService {
	constructor(private repository: GatewayOwnersRepository) {}

	/**
	 * Fetch a single ownership record by numeric ID
	 */
	async getById(id: number): Promise<GatewayOwner | null> {
		return this.repository.findById(id);
	}

	/**
	 * Fetch ownership records for a gateway
	 */
	async getByGatewayId(gatewayId: number): Promise<GatewayOwner[]> {
		return this.repository.findByGatewayId(gatewayId);
	}

	/**
	 * Fetch ownership records for a user
	 */
	async getByUserId(userId: string): Promise<GatewayOwner[]> {
		return this.repository.findByUserId(userId);
	}

	/**
	 * Fetch a specific ownership record by gateway/user pair
	 */
	async getByGatewayAndUser(gatewayId: number, userId: string): Promise<GatewayOwner | null> {
		return this.repository.findByGatewayAndUser(gatewayId, userId);
	}

	/**
	 * Assign a user to a gateway
	 */
	async addOwner(gatewayId: number, userId: string): Promise<GatewayOwner> {
		const existing = await this.repository.findByGatewayAndUser(gatewayId, userId);
		if (existing) {
			throw new Error(`User ${userId} already has access to gateway ${gatewayId}`);
		}

		const payload: GatewayOwnerInsert = {
			gateway_id: gatewayId,
			user_id: userId
		};

		return this.repository.create(payload);
	}

	/**
	 * Update a gateway ownership record
	 */
	async updateOwner(id: number, updates: GatewayOwnerUpdate): Promise<GatewayOwner | null> {
		return this.repository.update(id, updates);
	}

	/**
	 * Remove a gateway owner by record ID
	 */
	async removeOwner(id: number): Promise<void> {
		await this.repository.delete(id);
	}

	/**
	 * Remove a gateway owner by gateway/user pair
	 */
	async removeOwnerByGatewayAndUser(gatewayId: number, userId: string): Promise<void> {
		await this.repository.deleteByGatewayAndUser(gatewayId, userId);
	}
}
