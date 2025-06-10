import type { PageLoad, PageServerLoad } from './$types.js';

export interface LocationWithDevices {
  location_id: number;
  name: string;
  description?: string | null;
  lat?: number | null;
  long?: number | null;
  owner_id?: string | null;
  created_at: string;
  map_zoom?: number | null;
  cw_devices?: DeviceBasic[];
}

export interface DeviceBasic {
  dev_eui: string;
  name: string;
  device_type?: string | null;
  lat?: number | null;
  long?: number | null;
  created_at: string;
}

export interface PageData {
  locations: LocationWithDevices[];
}

export type { PageLoad, PageServerLoad };
