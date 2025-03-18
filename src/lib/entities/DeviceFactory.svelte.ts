import type { Device } from './Device.svelte';
import { SoilSensor } from './SoilSensor.svelte';
import { Co2Sensor } from './Co2Sensor.svelte';
import type { ISEEED_SoilSensor } from '$lib/interfaces/ISEEED_SoilSensor.interface';
import type { ICo2Sensor } from '$lib/interfaces/ICo2Sensor.interface';

const deviceClassMap: Record<string, (data: any) => Device<any>> = {
    '[SEEED] SenseCAP S2103 CO² T&H': (data) => new Co2Sensor(data),
    '[SEEED] S2100 DataLogger w/ NimBol 7-in-1 Soil Sensor': (data) => new SoilSensor(data),
};

export class DeviceFactory {
    static createDevice<T>(deviceData: any): Device<T> {
        const deviceCreator = deviceClassMap[deviceData.cw_device_type.name];
        if (!deviceCreator) {
            throw new Error(`Unsupported device type: ${deviceData.cw_device_type.name}`);
        }
        return deviceCreator(deviceData) as Device<T>;
    }
}