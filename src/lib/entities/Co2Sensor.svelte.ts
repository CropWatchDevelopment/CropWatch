import { Device } from './Device.svelte';
import type { ICo2Sensor } from '$lib/interfaces/ICo2Sensor.interface';

export class Co2Sensor extends Device<ICo2Sensor> {
    displayInfo(): string {
        return `CO2 Sensor: ${this.name}`;
    }
}