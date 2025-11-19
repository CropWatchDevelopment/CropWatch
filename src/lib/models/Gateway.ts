import type { Database } from '../../../database.types';

/**
 * Gateway table row type
 */
export type Gateway = Database['public']['Tables']['cw_gateways']['Row'];

/**
 * Gateway insert payload type
 */
export type GatewayInsert = Database['public']['Tables']['cw_gateways']['Insert'];

/**
 * Gateway update payload type
 */
export type GatewayUpdate = Database['public']['Tables']['cw_gateways']['Update'];

/**
 * Gateway owner row type
 */
export type GatewayOwner = Database['public']['Tables']['cw_gateways_owners']['Row'];

/**
 * Gateway owner insert payload type
 */
export type GatewayOwnerInsert = Database['public']['Tables']['cw_gateways_owners']['Insert'];

/**
 * Gateway owner update payload type
 */
export type GatewayOwnerUpdate = Database['public']['Tables']['cw_gateways_owners']['Update'];
