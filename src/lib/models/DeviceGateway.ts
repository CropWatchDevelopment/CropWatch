import type { Database } from '../../../database.types';
import type { Device } from './Device';
import type { Gateway } from './Gateway';

export type DeviceGateway = Database['public']['Tables']['cw_device_gateway']['Row'];
export type DeviceGatewayInsert = Database['public']['Tables']['cw_device_gateway']['Insert'];
export type DeviceGatewayUpdate = Database['public']['Tables']['cw_device_gateway']['Update'];

export type DeviceGatewayWithDevice = DeviceGateway & {
	device?: Pick<Device, 'name' | 'dev_eui'> | null;
	gateway?: Pick<Gateway, 'gateway_id' | 'gateway_name' | 'id'> | null;
};
