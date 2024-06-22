import { browser } from '$app/environment';
import { writable, type Writable } from 'svelte/store';

// Define Device interface
interface Device {
  dev_eui: string;
  name: string;
  data: any[]; // Array to store multiple data items
  [key: string]: any; // Additional properties can be dynamically added
}

// Load initial data from local storage
const loadFromLocalStorage = () => {
  const storedData = browser ?? localStorage.getItem('deviceStore');
  return storedData ? JSON.parse(storedData) : [];
};

// Create device store
function createDeviceStore() {
  const { subscribe, set, update }: Writable<Device[]> = writable(loadFromLocalStorage());

  const saveToLocalStorage = (items: Device[]) => {
    localStorage.setItem('deviceStore', JSON.stringify(items));
  };

  return {
    subscribe,
    add: (obj: Device) => {
      update(items => {
        const index = items.findIndex(item => item.dev_eui === obj.dev_eui);
        if (index === -1) {
          const newItems = [...items, obj];
          saveToLocalStorage(newItems);
          return newItems;
        } else {
          console.error('Item with dev_eui', obj.dev_eui, 'already exists.');
          return items;
        }
      });
    },

    updateDevice: (dev_eui: string, newData: any) => {
      update(items => {
        const index = items.findIndex(item => item.dev_eui === dev_eui);
        if (index === -1) {
          console.error('Item with dev_eui', dev_eui, 'does not exist.');
          return items;
        } else {
          items[index].data.push(newData); // Push new data onto the array
          const newItems = [...items];
          saveToLocalStorage(newItems);
          return newItems;
        }
      });
    },

    delete: (dev_eui: string) => {
      update(items => {
        const newItems = items.filter(item => item.dev_eui !== dev_eui);
        saveToLocalStorage(newItems);
        return newItems;
      });
    },

    search: (dev_eui: string) => {
      let found: Device | null = null;
      update(items => {
        found = items.find(item => item.dev_eui === dev_eui) || null;
        return items;
      });
      return found;
    },

    getLatestData: (dev_eui: string) => {
      let latestData: any = null;
      update(items => {
        const device = items.find(item => item.dev_eui === dev_eui);
        if (device && device.data.length > 0) {
          latestData = device.data[device.data.length - 1]; // Get the latest data item
        }
        return items;
      });
      return latestData;
    },

    getDevicesByLocation: (location_id: number) => {
      let devices: Device[] = [];
      update(items => {
        if (!items.length) return [];
        devices = items.filter(item => item.location_id === location_id);
        return items;
      });
      return devices;
    },
    
  };
}

export const deviceStore = createDeviceStore();
