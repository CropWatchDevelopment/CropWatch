import type { IDevice } from "$lib/interfaces/IDevice.interface";

export class Device<T> {
    id: string;
    name: string;
    data = $state<T>();

    constructor(device: IDevice) {
        this.id = device.dev_eui;
        this.name = device.name;
        this.data = device.latest_data as unknown as T;
    }

}
