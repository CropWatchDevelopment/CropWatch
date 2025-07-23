import type { Database } from '../../../database.types';

/**
 * Represents a gateway from the database
 */
export type Gateway = Database['public']['Tables']['cw_gateways']['Row'];

/**
 * Type for creating new gateway
 */
export type GatewayInsert = Database['public']['Tables']['cw_gateways']['Insert'];

/**
 * Type for updating existing gateway
 */
export type GatewayUpdate = Database['public']['Tables']['cw_gateways']['Update'];
