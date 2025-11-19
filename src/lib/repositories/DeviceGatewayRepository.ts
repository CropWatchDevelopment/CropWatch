import type { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './BaseRepository';
import type {
	DeviceGateway,
	DeviceGatewayInsert,
	DeviceGatewayUpdate,
	DeviceGatewayWithDevice
} from '../models/DeviceGateway';
import { ErrorHandlingService } from '../errors/ErrorHandlingService';

export class DeviceGatewayRepository extends BaseRepository<DeviceGateway, number> {
	protected tableName = 'cw_device_gateway';
	protected primaryKey = 'id';
	protected entityName = 'DeviceGateway';

	constructor(supabase: SupabaseClient, errorHandler: ErrorHandlingService) {
		super(supabase, errorHandler);
	}

	async findByGatewayId(gatewayId: string): Promise<DeviceGatewayWithDevice[]> {
		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*, cw_devices(name, dev_eui), cw_gateways(gateway_id, gateway_name, id)')
			.eq('gateway_id', gatewayId)
			.order('last_update', { ascending: false });

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				`Error finding device gateway entries for gateway ${gatewayId}`
			);
		}

		return this.mapWithDevice(data);
	}

	async findByGatewayIds(gatewayIds: string[]): Promise<DeviceGatewayWithDevice[]> {
		if (!gatewayIds.length) {
			return [];
		}

		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*, cw_devices(name, dev_eui), cw_gateways(gateway_id, gateway_name, id)')
			.in('gateway_id', gatewayIds)
			.order('gateway_id')
			.order('last_update', { ascending: false });

		if (error) {
			this.errorHandler.handleDatabaseError(
				error,
				'Error finding device gateway entries for gateways'
			);
		}

		return this.mapWithDevice(data);
	}

	async findByDeviceEuis(devEuis: string[]): Promise<DeviceGatewayWithDevice[]> {
		if (!devEuis.length) {
			return [];
		}

		const { data, error } = await this.supabase
			.from(this.tableName)
			.select('*, cw_devices(name, dev_eui), cw_gateways(gateway_id, gateway_name, id)')
			.in('dev_eui', devEuis)
			.order('dev_eui')
			.order('last_update', { ascending: false });

		if (error) {
			this.errorHandler.handleDatabaseError(error, 'Error finding gateways for devices');
		}

		return this.mapWithDevice(data);
	}

	private mapWithDevice(rows?: any[] | null): DeviceGatewayWithDevice[] {
		if (!rows) {
			return [];
		}

		return rows.map((row) => ({
			...row,
			device: Array.isArray(row.cw_devices) ? row.cw_devices[0] : row.cw_devices,
			gateway: Array.isArray(row.cw_gateways) ? row.cw_gateways[0] : row.cw_gateways
		})) as DeviceGatewayWithDevice[];
	}

	override async create(entity: DeviceGatewayInsert): Promise<DeviceGateway> {
		return super.create(entity);
	}

	override async update(id: number, entity: DeviceGatewayUpdate): Promise<DeviceGateway | null> {
		return super.update(id, entity);
	}
}
