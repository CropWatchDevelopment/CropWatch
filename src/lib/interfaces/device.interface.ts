export interface IDevice {
	dev_eui: string;
	name: string;
	location_name: string;
	group?: string;
	data_table?: string;
	created_at: Date;
	has_primary_data?: boolean;
	co2: number;
	humidity: number;
	temperature_c: number;
	soil_humidity?: number | null;
	cwloading?: boolean;
	location_id: number;
	alert_count?: number;
	upload_interval?: number;

	/** cw_device_type.id FK – used to look up device-type config */
	device_type_id?: number;
	/** Full raw sensor payload so dynamic keys can be resolved */
	raw_data?: Record<string, unknown>;
}
