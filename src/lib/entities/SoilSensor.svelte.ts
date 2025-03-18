import type { ISoilSensorDevice } from '$lib/interfaces/ISoilSensorDevice.interface';
import { Device } from './Device.svelte';

export class SoilSensor<T> extends Device<ISoilSensorDevice> {
    data!: T;

    constructor(deviceData: any) {
        super(deviceData);
        this.data = deviceData as T;
    }

    displayInfo(): string {
        return `Soil Sensor Device:`;
    }
}
