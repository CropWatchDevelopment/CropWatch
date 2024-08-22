// src/lib/stores.js
import { writable } from 'svelte/store';

// Define stores
export const locationsStore = writable([]);
export const devicesStore = writable({});
export const deviceDataStore = writable({});

// Function to update local storage
const updateLocalStorage = (key, value) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

// Subscribe to stores to update local storage
locationsStore.subscribe(value => updateLocalStorage('locations', value));
devicesStore.subscribe(value => updateLocalStorage('devices', value));
deviceDataStore.subscribe(value => updateLocalStorage('deviceData', value));

// Load from local storage if available
if (typeof localStorage !== 'undefined') {
  const storedLocations = JSON.parse(localStorage.getItem('locations'));
  const storedDevices = JSON.parse(localStorage.getItem('devices'));
  const storedDeviceData = JSON.parse(localStorage.getItem('deviceData'));

  if (storedLocations) locationsStore.set(storedLocations);
  if (storedDevices) devicesStore.set(storedDevices);
  if (storedDeviceData) deviceDataStore.set(storedDeviceData);
}
