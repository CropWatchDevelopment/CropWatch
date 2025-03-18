import type { Tables } from '$lib/types/database.types';

// export interface IDevice extends Tables<'cw_devices'> {
//     cw_device_type: Tables<'cw_device_type'>;
//     latest_data: any;
//     all_data: any[];
// }


export interface IDeviceBase {
    
    latest_data: Record<string, any>;
    all_data: Record<string, any>[];
}

export interface IDevice extends Tables<'cw_devices'>, IDeviceBase {
    cw_device_type: Tables<'cw_device_type'>;
}
