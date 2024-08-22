// src/stores/devicesStore.ts
import { writable } from 'svelte/store';
import moment from 'moment';

const devicesStore = writable({});

export function updateDeviceData(newData) {
    devicesStore.update((devices) => {
        devices[newData.dev_eui] = {
            ...newData,
            isDataOld: isDeviceDataOld(newData.created_at)
        };
        return devices;
    });
}

function isDeviceDataOld(createdAt) {
    if (!createdAt) {
        return true; // Consider it old if data is not available
    }
    return moment().diff(moment(createdAt), 'minutes') > 120;
}

export default devicesStore;
