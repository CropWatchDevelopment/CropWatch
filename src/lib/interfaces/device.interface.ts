export interface IDevice {
    dev_eui: string;
    name: string;
    location_name: string;
    group?: string;
    created_at: Date;
    co2: number;
    humidity: number;
    temperature_c: number;
    cwloading?: boolean;
    location_id: number;
}