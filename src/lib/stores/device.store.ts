// src/stores/devices.js
import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// Initialize the store with data from localStorage if available
const initialDeviceData = browser ? localStorage.getItem('devices') : '[]';
const initialDevices = JSON.parse(initialDeviceData ?? '[]');
export const devices = writable(initialDevices);

// Subscribe to changes in the store and update localStorage
devices.subscribe(currentDevices => {
    browser ? localStorage.setItem('devices', JSON.stringify(currentDevices)) : null;
});

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
