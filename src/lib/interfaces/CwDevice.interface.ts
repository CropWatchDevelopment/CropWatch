export interface CwDevice {
	dev_eui: string;
	name: string;
	type?: number | null;
	upload_interval?: number | null;
	lat?: number | null;
	long?: number | null;
	installed_at?: string | null;
	battery_changed_at?: string | null;
	user_id?: string | null;
	warranty_start_date?: string | null;
	sensor1_serial?: string | null;
	sensor2_serial?: string | null;
	sensor_serial?: string | null;
	location_id?: number | null;
	report_endpoint?: string | null;
	battery_level?: number | null;
	last_data_updated_at?: string | null;
	tti_name?: string | null;
	primary_data?: string | null;
	secondary_data?: string | null;
	group?: string | null;
	created_at?: string | null;
	location_name?: string;
	has_primary_data?: boolean;
	[key: string]: unknown;
}
