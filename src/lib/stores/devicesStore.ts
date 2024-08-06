import { writable } from 'svelte/store';
import createLocalStore from '$lib/stores/localStore';

const initialDevices = createLocalStore('devices', {});
const devicesStore = writable(initialDevices);

devicesStore.subscribe(value => {
  createLocalStore('devices', value);
});

export default devicesStore;
