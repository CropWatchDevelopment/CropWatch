// src/stores/devices.js
import { writable } from 'svelte/store';

export const devices = writable([]);

export function addOrUpdateDevice(device) {
    devices.update(currentDevices => {
        const index = currentDevices.findIndex(d => d.dev_eui === device.dev_eui);
        if (index !== -1) {
            // Update existing device
            currentDevices[index] = device;
        } else {
            // Add new device
            currentDevices.push(device);
        }
        return currentDevices;
    });
}

export function getDeviceByDevEui(dev_eui) {
    let device;
    devices.subscribe(currentDevices => {
        device = currentDevices.find(d => d.dev_eui === dev_eui);
    })();
    return device;
}

export function getAllDevices() {
    let allDevices;
    devices.subscribe(currentDevices => {
        allDevices = currentDevices;
    })();
    return allDevices;
}
