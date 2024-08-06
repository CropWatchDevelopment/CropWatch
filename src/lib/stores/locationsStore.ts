import { writable } from 'svelte/store';
import createLocalStore from '$lib/stores/localStore';

const initialLocations = createLocalStore('locations', []);
const locationsStore = writable(initialLocations);

locationsStore.subscribe(value => {
  createLocalStore('locations', value);
});

export default locationsStore;
