import { browser } from '$app/environment';
import { writable, type Writable, get } from 'svelte/store';

// Define Device interface
interface Device {
  dev_eui: string;
  name: string;
  location_id: number; // Ensure location_id is included
  data: any[]; // Array to store multiple data items
  [key: string]: any; // Additional properties can be dynamically added
}

// Load initial data from local storage
const loadFromLocalStorage = () => {
  if (!browser) return [];
  const storedData = localStorage.getItem('deviceStore');
  return storedData ? JSON.parse(storedData) : [];
};

// Create device store
function createDeviceDataStore() {
  const { subscribe, set, update }: Writable<Device[]> = writable(loadFromLocalStorage());

  const saveToLocalStorage = (items: Device[]) => {
    if (browser) {
      localStorage.setItem('deviceStore', JSON.stringify(items));
    }
  };

  const limitItems = (items: Device[]) => {
    if (items.length > 30) {
      items.splice(0, items.length - 30);
    }
    return items;
  };

  return {
    subscribe,
    add: (obj: Device) => {

    },

    updateDevice: (newData: any) => {
      update(item => {
        debugger;
        const index = item.findIndex(i => i.dev_eui === newData.dev_eui);
        if (index === -1) {
          item.push(newData);
          return item;
        }
        const existingDevice = item[index];
        if (!existingDevice) item = {...newData };
        item[index] = newData;
        return item;
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
      const items = get(deviceStore);
      return items.find(item => item.dev_eui === dev_eui) || null;
    },

    getLatestData: (dev_eui: string) => {
      const items = get(deviceStore);
      const device = items.find(item => item.dev_eui === dev_eui);
      return device && device.data.length > 0 ? device.data[device.data.length - 1] : null;
    },

    getDevicesByLocation: (location_id: number) => {
      const items = get(deviceStore);
      return items.filter(item => item.location_id === location_id);
    }
  };
}

export const deviceDataStore = createDeviceDataStore();
