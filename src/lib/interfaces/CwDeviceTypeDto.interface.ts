export interface CwDeviceType {
	id: number;
	name: string;
	model: string;
	decoder?: string | null;
	is_active?: boolean | null;
	isActive?: boolean | null;
	created_at?: string | null;
	data_table?: string | null;
	manufacturer?: string | null;
	primary_data?: string | null;
	data_table_v2?: string | null;
	secondary_data?: string | null;
	primary_data_v2?: string | null;
	primary_divider?: number | null;
	secondary_data_v2?: string | null;
	secondary_divider?: number | null;
	tti_application_id?: string | null;
	TTI_application_id?: string | null;
	primary_multiplier?: number | null;
	secondary_multiplier?: number | null;
	primary_data_notation?: string | null;
	default_upload_interval?: number | null;
	secondary_data_notation?: string | null;
	[key: string]: unknown;
}
