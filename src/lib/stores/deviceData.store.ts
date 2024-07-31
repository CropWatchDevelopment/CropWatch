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
      update(items => {
        items.push(obj);
        saveToLocalStorage(limitItems(items));
        return items;
      });
    },

    updateDevice: (newData: any) => {
      update(items => {
        const index = items.findIndex(i => i.dev_eui === newData.dev_eui);
        if (index === -1) {
          items.push(newData);
          saveToLocalStorage(limitItems(items));
          return items;
        }
        items[index] = newData;
        saveToLocalStorage(limitItems(items));
        return items;
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
      const items = get(deviceDataStore);
      return items.find(item => item.dev_eui === dev_eui) || null;
    },

    getLatestData: (dev_eui: string) => {
      const items = get(deviceDataStore);
      const device = items.find(item => item.dev_eui === dev_eui);
      return device && Array.isArray(device.data) && device.data.length > 0 
        ? device.data[device.data.length - 1] 
        : null;
    },
    

    getDevicesByLocation: (location_id: number) => {
      const items = get(deviceDataStore);
      return items.filter(item => item.location_id === location_id);
    }
  };
}

export const deviceDataStore = createDeviceDataStore();
