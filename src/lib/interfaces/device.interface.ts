export interface IDevice {
    dev_eui: string;
    name: string;
    location_name: string;
    group?: string;
    created_at: Date;
    has_primary_data?: boolean;
    co2: number;
    humidity: number;
    temperature_c: number;
    cwloading?: boolean;
    location_id: number;
}
