import type { ReportDto } from '$lib/api/api.dtos';

export type ReportDeviceRelations = {
	cw_devices?: {
		name?: string | null;
		cw_device_owners?: Array<{
			user_id?: string | null;
			permission_level?: number | null;
		}> | null;
		cw_locations?: {
			name?: string | null;
			location_id?: string | number | null;
		} | null;
	} | null;
};

export type ReportRow = ReportDto &
	ReportDeviceRelations & {
		device_name: string;
		location_name: string;
		permission_level: number | null;
	};
