import { DeviceGatewayRepository } from '../repositories/DeviceGatewayRepository';
import type { DeviceGatewayWithDevice } from '../models/DeviceGateway';

export class DeviceGatewayService {
	constructor(private repository: DeviceGatewayRepository) {}

	async getDevicesForGateway(gatewayId: string): Promise<DeviceGatewayWithDevice[]> {
		return this.repository.findByGatewayId(gatewayId);
	}

	async getDevicesForGatewayIds(
		gatewayIds: string[]
	): Promise<Record<string, DeviceGatewayWithDevice[]>> {
		const rows = await this.repository.findByGatewayIds(gatewayIds);
		return rows.reduce<Record<string, DeviceGatewayWithDevice[]>>((acc, row) => {
			if (!acc[row.gateway_id]) {
				acc[row.gateway_id] = [];
			}
			acc[row.gateway_id].push(row);
			return acc;
		}, {});
	}

	async getGatewaysForDevices(
		devEuis: string[]
	): Promise<Record<string, DeviceGatewayWithDevice[]>> {
		const rows = await this.repository.findByDeviceEuis(devEuis);
		return rows.reduce<Record<string, DeviceGatewayWithDevice[]>>((acc, row) => {
			if (!acc[row.dev_eui]) {
				acc[row.dev_eui] = [];
			}
			acc[row.dev_eui].push(row);
			return acc;
		}, {});
	}
}
