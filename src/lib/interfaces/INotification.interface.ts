export interface INotification {
    title: string;
    subtitle?: string;
    details?: string;
    servarity: number;
    icon?: string;
    fromDeviceID: string; // Why not From Dev_eui? Because we may use something other than LoRaWAN in the future
}