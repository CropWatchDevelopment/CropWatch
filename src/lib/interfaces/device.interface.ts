export interface IDevice {
	dev_eui: string;
	name: string;
	location_name: string;
	group?: string;
	data_table?: string;
	/** Timestamp of the latest sensor reading */
	created_at: Date;
	/** cw_devices.last_data_updated_at — preferred for "last seen" display */
	last_data_updated_at?: Date | null;
	/** cw_devices.upload_interval in minutes — used for freshness thresholds */
	upload_interval?: number | null;
	has_primary_data?: boolean;
	co2: number;
	humidity: number;
	temperature_c: number;
	soil_humidity?: number | null;
	cwloading?: boolean;
	location_id: number;
	alert_count?: number;

	/** cw_device_type.id FK – used to look up device-type config */
	device_type_id?: number;
	/** Full raw sensor payload so dynamic keys can be resolved */
	raw_data?: Record<string, unknown>;
}
