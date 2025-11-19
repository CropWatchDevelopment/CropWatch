import { GatewayRepository } from '../repositories/GatewayRepository';
import type {
	Gateway,
	GatewayInsert,
	GatewayOwner,
	GatewayOwnerInsert,
	GatewayUpdate
} from '../models/Gateway';

/**
 * Service encapsulating business logic for gateways
 */
export class GatewayService {
	constructor(private gatewayRepository: GatewayRepository) {}

	/**
	 * Fetch a gateway by its numeric ID
	 */
	async getGatewayById(id: number): Promise<Gateway | null> {
		return this.gatewayRepository.findById(id);
	}

	/**
	 * Fetch a gateway by its external gateway identifier
	 */
	async getGatewayByGatewayId(gatewayId: string): Promise<Gateway | null> {
		return this.gatewayRepository.findByGatewayId(gatewayId);
	}

	/**
	 * Return every gateway record
	 */
	async getAllGateways(): Promise<Gateway[]> {
		return this.gatewayRepository.findAll();
	}

	/**
	 * Return only gateways flagged as public
	 */
	async getPublicGateways(): Promise<Gateway[]> {
		return this.gatewayRepository.findPublicGateways();
	}

	/**
	 * Get the gateways a user owns or shares
	 */
	async getGatewaysByUser(userId: string): Promise<Gateway[]> {
		return this.gatewayRepository.findByUser(userId);
	}

	/**
	 * Create a new gateway
	 */
	async createGateway(payload: GatewayInsert): Promise<Gateway> {
		return this.gatewayRepository.create(payload);
	}

	/**
	 * Update an existing gateway by numeric ID
	 */
	async updateGateway(id: number, payload: GatewayUpdate): Promise<Gateway | null> {
		return this.gatewayRepository.update(id, payload);
	}

	/**
	 * Delete a gateway by numeric ID
	 */
	async deleteGateway(id: number): Promise<boolean> {
		return this.gatewayRepository.delete(id);
	}

	/**
	 * Upsert using the unique gateway_id column
	 */
	async upsertGatewayByGatewayId(payload: GatewayInsert | GatewayUpdate): Promise<Gateway> {
		return this.gatewayRepository.upsertByGatewayId(payload);
	}

	/**
	 * Update online/offline status via gateway_id
	 */
	async setGatewayOnlineStatus(gatewayId: string, isOnline: boolean): Promise<Gateway | null> {
		return this.gatewayRepository.setOnlineStatusByGatewayId(gatewayId, isOnline);
	}

	/**
	 * Add an owner relationship for a gateway
	 */
	async addGatewayOwner(payload: GatewayOwnerInsert): Promise<GatewayOwner> {
		return this.gatewayRepository.addOwner(payload);
	}

	/**
	 * Remove an owner relationship for a gateway
	 */
	async removeGatewayOwner(gatewayId: number, userId: string): Promise<void> {
		return this.gatewayRepository.removeOwner(gatewayId, userId);
	}
}
