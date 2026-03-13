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
	soil_temperature_c?: number | null;
	soil_humidity?: number | null;
	cwloading?: boolean;
	location_id: number;
}
