// src/lib/stores/device.store.js
import { writable } from 'svelte/store';

const createDeviceStore = () => {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    setDevices: (devices) => set(devices),
    add: (device) => update(devices => {
      const existingDeviceIndex = devices.findIndex(d => d.dev_eui === device.dev_eui);
      if (existingDeviceIndex === -1) {
        return [...devices, device];
      }
      return devices;
    }),
    updateDevice: (updatedDevice) => update(devices => {
      const index = devices.findIndex(d => d.dev_eui === updatedDevice.dev_eui);
      if (index !== -1) {
        devices[index] = updatedDevice;
      }
      return devices;
    }),
    remove: (deviceId) => update(devices => devices.filter(device => device.dev_eui !== deviceId))
  };
};

export const deviceStore = createDeviceStore();
