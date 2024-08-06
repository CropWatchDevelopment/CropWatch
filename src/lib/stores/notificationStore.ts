import { writable } from 'svelte/store';

const initialDevices = createNotificationStore('devices', {});
const notificationStore = writable(initialDevices);



export default notificationStore;
